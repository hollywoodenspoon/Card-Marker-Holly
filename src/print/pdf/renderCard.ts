import type {
  Element,
  ImageElement,
  ImageFieldElement,
  ShapeElement,
  TextElement,
} from '@/core/model/types'
import { iconRowLayout } from '@/core/render/iconRowLayout'
import { FULL_CROP, framePlacement } from '@/core/render/imageMath'
import type { RenderNode } from '@/core/render/renderTypes'
import { textLayoutInput } from '@/core/render/textInput'
import { layoutText, SYMBOL_TOP_EM, type Fragment, type SymbolLookup } from '@/core/text/layout'
import type { Measurer } from '@/core/text/measure'
import type { Rect } from '../layout'
import { ellipsePath, roundedRectPath, type DrawTarget, type PdfImage } from './drawTarget'
import { multiply, rotate, scale, translate } from './matrix'

/** What the card renderer needs from the outside world. */
export interface PrintResources {
  measurer: Measurer
  /** Image bytes / SVG for an asset (cached by the caller). */
  image(assetId: string): Promise<PdfImage | undefined>
  info(assetId: string): { widthPx: number; heightPx: number; isVector: boolean } | undefined
  /** Draw one text fragment with its baseline at (x, baseline), in the current transform. */
  text(t: DrawTarget, f: Fragment, x: number, baseline: number): Promise<void>
  symbols?: SymbolLookup
}

/**
 * Draw one card into a sheet cell. The card's (0, 0) is placed at the trim
 * corner; drawing is clipped to the bleed box. Mirrors the Konva renderer;
 * editor-only marks (placeholders, overflow, DPI badges) are not printed.
 */
export async function renderCard(
  t: DrawTarget,
  nodes: RenderNode[],
  cell: Rect,
  trim: Rect,
  res: PrintResources,
) {
  t.save()
  t.rect(cell.x, cell.y, cell.w, cell.h)
  t.clip()
  t.transform(translate(trim.x, trim.y))
  for (const n of nodes) await drawNode(t, n, 1, res)
  t.restore()
}

async function drawNode(t: DrawTarget, n: RenderNode, parentAlpha: number, res: PrintResources) {
  const el = n.element
  const alpha = parentAlpha * el.opacity
  if (alpha <= 0) return
  if (el.type === 'group') {
    for (const c of n.children ?? []) await drawNode(t, c, alpha, res)
    return
  }
  t.save()
  let m = multiply(translate(el.xMm, el.yMm), rotate(el.rotation))
  if (el.flipX) m = multiply(m, multiply(translate(el.wMm, 0), scale(-1, 1)))
  if (el.flipY) m = multiply(m, multiply(translate(0, el.hMm), scale(1, -1)))
  t.transform(m)
  t.opacity(alpha)
  switch (el.type) {
    case 'shape':
      drawShape(t, el)
      break
    case 'image':
      await drawImage(t, el, res)
      break
    case 'imageField':
      await drawImageField(t, el, n, res)
      break
    case 'iconRow':
      await drawIconRow(t, el, n.count ?? el.defaultCount, res)
      break
    case 'text':
      if (n.text) await drawText(t, el, n.text.text, res)
      break
  }
  t.restore()
}

function drawShape(t: DrawTarget, el: ShapeElement) {
  const hasStroke = !!el.stroke && el.strokeMm > 0
  if (el.kind === 'line') {
    const color = el.stroke ?? el.fill ?? '#000000'
    t.strokeColor(color)
    t.lineWidth(el.strokeMm)
    t.moveTo(0, el.hMm / 2)
    t.lineTo(el.wMm, el.hMm / 2)
    t.stroke()
    return
  }
  const path = () =>
    el.kind === 'ellipse'
      ? ellipsePath(t, 0, 0, el.wMm, el.hMm)
      : roundedRectPath(t, 0, 0, el.wMm, el.hMm, el.radiusMm)
  if (el.fill) t.fillColor(el.fill)
  if (hasStroke) {
    t.strokeColor(el.stroke!)
    t.lineWidth(el.strokeMm)
  }
  if (!el.fill && !hasStroke) return
  path()
  if (el.fill && hasStroke) t.fillStroke()
  else if (el.fill) t.fill()
  else t.stroke()
}

async function drawImage(t: DrawTarget, el: ImageElement, res: PrintResources) {
  const img = await res.image(el.assetId)
  if (!img) return
  const c = el.crop ?? FULL_CROP
  // The whole picture, scaled so the crop window fills the box.
  const fullW = el.wMm / c.w
  const fullH = el.hMm / c.h
  t.save()
  t.rect(0, 0, el.wMm, el.hMm)
  t.clip()
  await t.image(img, -c.x * fullW, -c.y * fullH, fullW, fullH)
  t.restore()
}

async function drawImageField(
  t: DrawTarget,
  el: ImageFieldElement,
  n: RenderNode,
  res: PrintResources,
) {
  const v = n.image
  const info = v?.assetId ? res.info(v.assetId) : undefined
  const img = v?.assetId ? await res.image(v.assetId) : undefined
  if (!v || !info || !img) return // an empty art box is an editor placeholder
  t.save()
  roundedRectPath(t, 0, 0, el.wMm, el.hMm, el.radiusMm)
  t.clip()
  if (v.fit === 'fit') {
    t.fillColor(el.placeholderColor)
    t.rect(0, 0, el.wMm, el.hMm)
    t.fill()
  }
  const p = framePlacement(el.wMm, el.hMm, info.widthPx, info.heightPx, v)
  await t.image(img, p.x, p.y, p.w, p.h)
  t.restore()
}

async function drawIconRow(
  t: DrawTarget,
  el: Element & { type: 'iconRow' },
  count: number,
  res: PrintResources,
) {
  if (!el.assetId) return
  const info = res.info(el.assetId)
  const img = await res.image(el.assetId)
  if (!info || !img) return
  for (const r of iconRowLayout({ w: el.wMm, h: el.hMm }, count, info.widthPx / info.heightPx, el))
    await t.image(img, r.x, r.y, r.w, r.h)
}

async function drawText(
  t: DrawTarget,
  el: TextElement,
  text: TextElement['defaultText'],
  res: PrintResources,
) {
  const layout = layoutText(textLayoutInput(el, text, res.symbols), res.measurer)
  const pad = el.paddingMm
  for (const line of layout.lines) {
    const baseline = pad + layout.offsetY + line.baseline
    for (const f of line.fragments) {
      const x = pad + f.x
      if (f.symbolAssetId) {
        const img = await res.image(f.symbolAssetId)
        if (img) await t.image(img, x, baseline - SYMBOL_TOP_EM * f.sizeMm, f.width, f.sizeMm)
        continue
      }
      if (f.text.trim()) await res.text(t, f, x, baseline)
      if (f.style.underline) {
        const size = f.sizeMm
        t.fillColor(f.style.color)
        t.rect(x, baseline + size * 0.12, f.width, Math.max(size * 0.06, 0.05))
        t.fill()
      }
    }
  }
}
