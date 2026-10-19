import type { Font } from 'fontkit'
import type { Fragment } from '@/core/text/layout'
import { cssFont, type Measurer } from '@/core/text/measure'
import { textEffects, type TextPass } from '@/core/text/effects'
import type { DrawTarget, PdfImage } from './drawTarget'
import type { FontSources } from './fontSources'

/** Raster fallback resolution for text in fonts we have no file for. */
const FALLBACK_DPI = 600

/**
 * Draws text fragments as vector glyph outlines (fontkit), so the PDF looks
 * like the preview without embedding fonts. Text in a system font with no
 * file is rasterised at 600 dpi instead and reported.
 */
export function makeTextDrawer(
  fonts: FontSources,
  measurer: Measurer,
  onFallback: (family: string) => void,
) {
  let rasterId = 0
  return async function drawFragment(
    t: DrawTarget,
    f: Fragment,
    x0: number,
    baseline: number,
    pass: TextPass = 'fill',
    alpha = 1,
  ) {
    const resolved = await fonts.resolve(f.style)
    if (!resolved) {
      // The raster fallback draws its shadow and outline together with the letters.
      if (pass !== 'fill') return
      onFallback(f.style.fontFamily)
      return drawRaster(t, f, x0, baseline, measurer, `txt${rasterId++}`)
    }
    const size = f.sizeMm
    const ls = f.style.letterSpacingEm * size
    const fx = textEffects(f.style, size)
    t.save()
    let paint: () => void
    if (pass === 'shadow' && fx.shadow) {
      t.transform([1, 0, 0, 1, fx.shadow.dxMm, fx.shadow.dyMm])
      t.opacity(alpha * fx.shadow.opacity)
      t.fillColor(fx.shadow.color)
      if (fx.outline) {
        t.strokeColor(fx.shadow.color)
        t.lineWidth(fx.outline.widthMm * 2)
        t.lineJoin('round')
        paint = () => t.fillStroke()
      } else paint = () => t.fill()
    } else if (pass === 'outline' && fx.outline) {
      t.strokeColor(fx.outline.color)
      t.lineWidth(fx.outline.widthMm * 2)
      t.lineJoin('round')
      paint = () => t.stroke()
    } else {
      t.fillColor(f.style.color)
      if (resolved.synthBold) {
        t.strokeColor(f.style.color)
        t.lineWidth(size * 0.035)
        paint = () => t.fillStroke()
      } else paint = () => t.fill()
    }
    if (resolved.synthItalic) {
      // Lean glyphs ~11° around the baseline, as browsers do for missing italics.
      const k = 0.2
      t.transform([1, 0, -k, 1, k * baseline, 0])
    }
    let x = x0
    for (const seg of segmentByFont(f.text, resolved.fonts)) {
      const s = size / seg.font.unitsPerEm
      const run = seg.font.layout(seg.text)
      run.glyphs.forEach((g, i) => {
        const p = run.positions[i]
        const gx = x + p.xOffset * s
        const gy = baseline - p.yOffset * s
        if (glyphPath(t, g.path.commands, gx, gy, s)) paint()
        x += p.xAdvance * s + ls
      })
    }
    t.restore()
  }
}

/** Emit a glyph's outline; returns false for empty glyphs (spaces). */
function glyphPath(
  t: DrawTarget,
  cmds: { command: string; args: number[] }[],
  ox: number,
  oy: number,
  s: number,
) {
  if (!cmds.length) return false
  const X = (v: number) => ox + v * s
  const Y = (v: number) => oy - v * s // font units are y-up
  let cx = 0
  let cy = 0
  for (const c of cmds) {
    const a = c.args
    switch (c.command) {
      case 'moveTo':
        t.moveTo(X(a[0]), Y(a[1]))
        ;[cx, cy] = [a[0], a[1]]
        break
      case 'lineTo':
        t.lineTo(X(a[0]), Y(a[1]))
        ;[cx, cy] = [a[0], a[1]]
        break
      case 'quadraticCurveTo': {
        // quadratic → cubic
        const [qx, qy, x, y] = a
        t.curveTo(
          X(cx + (2 / 3) * (qx - cx)),
          Y(cy + (2 / 3) * (qy - cy)),
          X(x + (2 / 3) * (qx - x)),
          Y(y + (2 / 3) * (qy - y)),
          X(x),
          Y(y),
        )
        ;[cx, cy] = [x, y]
        break
      }
      case 'bezierCurveTo':
        t.curveTo(X(a[0]), Y(a[1]), X(a[2]), Y(a[3]), X(a[4]), Y(a[5]))
        ;[cx, cy] = [a[4], a[5]]
        break
      case 'closePath':
        t.closePath()
        break
    }
  }
  return true
}

/** Split text into runs drawn with the first font that has each character. */
export function segmentByFont(text: string, fonts: Font[]): { font: Font; text: string }[] {
  const out: { font: Font; text: string }[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    const font = fonts.find((f) => f.hasGlyphForCodePoint(cp)) ?? fonts[0]
    const last = out[out.length - 1]
    if (last && last.font === font) last.text += ch
    else out.push({ font, text: ch })
  }
  return out
}

async function drawRaster(
  t: DrawTarget,
  f: Fragment,
  x: number,
  baseline: number,
  measurer: Measurer,
  id: string,
) {
  const m = measurer.metrics(f.style, f.sizeMm)
  const fx = textEffects(f.style, f.sizeMm)
  // Room around the letters for overhangs, the outline and the shadow offset (mm).
  const out = (fx.outline?.widthMm ?? 0) + f.sizeMm * 0.1
  const left = out + Math.max(0, -(fx.shadow?.dxMm ?? 0))
  const top = out + Math.max(0, -(fx.shadow?.dyMm ?? 0))
  const w = left + f.width + out + Math.max(0, fx.shadow?.dxMm ?? 0) + f.sizeMm * 0.1
  const h = top + m.ascent + m.descent + out + Math.max(0, fx.shadow?.dyMm ?? 0)
  const pxPerMm = FALLBACK_DPI / 25.4
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(w * pxPerMm))
  canvas.height = Math.max(1, Math.ceil(h * pxPerMm))
  const ctx = canvas.getContext('2d')!
  ctx.font = cssFont(f.style, f.sizeMm * pxPerMm)
  ctx.textBaseline = 'alphabetic'
  ctx.lineJoin = 'round'
  const ls = f.style.letterSpacingEm * f.sizeMm * pxPerMm
  const draw = (paint: (s: string, x: number, y: number) => void, dx = 0, dy = 0) => {
    const x0 = (left + dx) * pxPerMm
    const y0 = (top + m.ascent + dy) * pxPerMm
    if (ls) {
      let cx = x0
      for (const ch of f.text) {
        paint(ch, cx, y0)
        cx += ctx.measureText(ch).width + ls
      }
    } else paint(f.text, x0, y0)
  }
  const lw = (fx.outline?.widthMm ?? 0) * 2 * pxPerMm
  if (fx.shadow) {
    ctx.globalAlpha = fx.shadow.opacity
    ctx.fillStyle = ctx.strokeStyle = fx.shadow.color
    ctx.lineWidth = lw
    draw(
      (s, x, y) => {
        if (lw) ctx.strokeText(s, x, y)
        ctx.fillText(s, x, y)
      },
      fx.shadow.dxMm,
      fx.shadow.dyMm,
    )
    ctx.globalAlpha = 1
  }
  if (fx.outline) {
    ctx.strokeStyle = fx.outline.color
    ctx.lineWidth = lw
    draw((s, x, y) => ctx.strokeText(s, x, y))
  }
  ctx.fillStyle = f.style.color
  draw((s, x, y) => ctx.fillText(s, x, y))
  const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'))
  const img: PdfImage = {
    kind: 'raster',
    id,
    format: 'PNG',
    data: new Uint8Array(await blob.arrayBuffer()),
    widthPx: canvas.width,
    heightPx: canvas.height,
  }
  await t.image(
    img,
    x - left,
    baseline - m.ascent - top,
    canvas.width / pxPerMm,
    canvas.height / pxPerMm,
  )
}
