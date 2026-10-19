import type {
  Element,
  ImageElement,
  ImageFieldElement,
  ShapeElement,
  TextElement,
} from '@/core/model/types'
import { iconRowLayout, iconRowSlots } from '@/core/render/iconRowLayout'
import { FULL_CROP, framePlacement } from '@/core/render/imageMath'
import type { RenderNode } from '@/core/render/renderTypes'
import { textLayoutInput } from '@/core/render/textInput'
import { TEXT_PASSES, textEffects, type TextPass } from '@/core/text/effects'
import { layoutText, SYMBOL_TOP_EM, type Fragment, type SymbolLookup } from '@/core/text/layout'
import type { Measurer } from '@/core/text/measure'
import type { Rect } from '../layout'
import { greyImage } from './greyTarget'
import { ellipsePath, roundedRectPath, type DrawTarget, type PdfImage } from './drawTarget'
import { multiply, rotate, scale, translate } from './matrix'

/** What the card renderer needs from the outside world. */
export interface PrintResources {
  measurer: Measurer
  /** Image bytes / SVG for an asset (cached by the caller). */
  image(assetId: string): Promise<PdfImage | undefined>
  info(assetId: string): { widthPx: number; heightPx: number; isVector: boolean } | undefined
  /**
   * Draw one text fragment with its baseline at (x, baseline), in the current
   * transform: its shadow, its outline, or the letters themselves.
   */
  text(
    t: DrawTarget,
    f: Fragment,
    x: number,
    baseline: number,
    pass?: TextPass,
    alpha?: number,
  ): Promise<void>
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
      drawShape(t, el, alpha)
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
      if (n.text) await drawText(t, el, n.text.text, res, alpha)
      break
  }
  t.restore()
}

function drawShape(t: DrawTarget, el: ShapeElement, alpha: number) {
  if (el.shadow && el.shadow.opacity > 0 && (el.shadow.dxMm || el.shadow.dyMm)) {
    const sh = el.shadow
    t.save()
    t.transform(translate(sh.dxMm, sh.dyMm))
    t.opacity(alpha * sh.opacity)
    const stroke = el.kind === 'line' || el.stroke ? sh.color : null
    paintShape(t, { ...el, fill: el.fill && sh.color, stroke })
    t.restore()
  }
  paintShape(t, el)
}

function paintShape(t: DrawTarget, el: ShapeElement) {
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
  const slots = iconRowSlots(count, el)
  const rects = iconRowLayout(
    { w: el.wMm, h: el.hMm },
    slots.length,
    info.widthPx / info.heightPx,
    el,
  )
  let grey: PdfImage | undefined
  if (slots.some(Boolean) && rects[0]) {
    const key = `${rects[0].w.toFixed(3)}x${rects[0].h.toFixed(3)}`
    let byImg = greyCache.get(img)
    if (!byImg) greyCache.set(img, (byImg = new Map()))
    let p = byImg.get(key)
    if (!p) byImg.set(key, (p = greyImage(img, rects[0].w, rects[0].h)))
    grey = await p
  }
  for (const [i, r] of rects.entries()) await t.image((slots[i] && grey) || img, r.x, r.y, r.w, r.h)
}

/** Greyscale icon copies, per picture and printed size (SVGs are rasterised for this). */
const greyCache = new WeakMap<PdfImage, Map<string, Promise<PdfImage | undefined>>>()

async function drawText(
  t: DrawTarget,
  el: TextElement,
  text: TextElement['defaultText'],
  res: PrintResources,
  alpha: number,
) {
  const layout = layoutText(textLayoutInput(el, text, res.symbols), res.measurer)
  const pad = el.paddingMm
  const frags = layout.lines.flatMap((line) =>
    line.fragments.map((f) => ({
      f,
      x: pad + f.x,
      baseline: pad + layout.offsetY + line.baseline,
    })),
  )
  // Every shadow first, then every outline, then the letters, as on the canvas.
  for (const pass of TEXT_PASSES) {
    for (const { f, x, baseline } of frags) {
      const fx = textEffects(f.style, f.sizeMm)
      if (pass === 'shadow' && !fx.shadow) continue
      if (pass === 'outline' && !fx.outline) continue
      if (f.symbolAssetId) {
        if (pass !== 'fill') continue
        const img = await res.image(f.symbolAssetId)
        if (img) await t.image(img, x, baseline - SYMBOL_TOP_EM * f.sizeMm, f.width, f.sizeMm)
        continue
      }
      if (f.text.trim()) await res.text(t, f, x, baseline, pass, alpha)
      if (f.style.underline && pass !== 'outline') {
        const size = f.sizeMm
        const dx = pass === 'shadow' ? fx.shadow!.dxMm : 0
        const dy = pass === 'shadow' ? fx.shadow!.dyMm : 0
        t.save()
        if (pass === 'shadow') t.opacity(alpha * fx.shadow!.opacity)
        t.fillColor(pass === 'shadow' ? fx.shadow!.color : f.style.color)
        t.rect(x + dx, baseline + dy + size * 0.12, f.width, Math.max(size * 0.06, 0.05))
        t.fill()
        t.restore()
      }
    }
  }
}
