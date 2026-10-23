import {
  blackFor,
  formatCmyk,
  hexToRgb,
  isBlack,
  limitInk,
  PLAIN_BLACK,
  rgbToHex,
  totalInk,
  type Cmyk,
} from '../color/cmyk'
import type { ColorEngine } from '../color/engine'
import { decode } from './canvasTarget'
import { alphaOf, type CmykRaster } from './cmykPdf'
import type { DrawTarget, PdfImage } from './drawTarget'
import type { JsPdfTarget } from './jsPdfTarget'
import { apply, IDENTITY, multiply, type Matrix } from './matrix'

/** SVGs that keep their vectors as CMYK need only flat colours; these features need a raster. */
const NEEDS_RASTER = /<(linearGradient|radialGradient|image|mask|filter|feImage)[\s>/]/i
/** Resolution for SVGs that have to become CMYK images. */
const SVG_RASTER_DPI = 600
/** Photos above this resolution at their printed size are scaled down (keeps the PDF small). */
const MAX_IMAGE_DPI = 600

export interface CmykOptions {
  engine: ColorEngine
  /** Exact CMYK for chosen colours, by lower-case "#rrggbb" (0–1 per ink). */
  swatches?: Record<string, Cmyk>
  warn(message: string): void
}

/** An SVG that has to print as a CMYK image (gradients, embedded photos, masks or filters). */
export const svgNeedsRaster = (svg: string) => NEEDS_RASTER.test(svg)

type Op = (t: JsPdfTarget) => void

/**
 * Draws everything in CMYK through the printer profile:
 * - colours are converted (or taken from the exact CMYK swatches);
 * - black is plain 100% K for text, lines and small shapes, rich black for
 *   fills of 10 × 10 mm or more;
 * - photos and PNGs are converted pixel by pixel;
 * - SVGs stay vector with their colours converted, unless they use gradients,
 *   photos, masks or filters, which print as 600 DPI CMYK images.
 *
 * Path operations are held until the path is painted, so the black rule can
 * see the shape's printed size (PDF allows no colour change inside a path).
 */
export class CmykTarget implements DrawTarget {
  private ctm: Matrix = IDENTITY
  private stack: Matrix[] = []
  private path: Op[] = []
  private box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  private fillHex = '#000000'
  private strokeHex = '#000000'
  private images = new Map<string, Promise<CmykRaster | undefined>>()
  private swatches: Record<string, Cmyk>

  constructor(
    private pdf: JsPdfTarget,
    private o: CmykOptions,
  ) {
    this.swatches = {}
    for (const [hex, c] of Object.entries(o.swatches ?? {})) {
      const limited = limitInk(c, o.engine.inkLimit)
      if (totalInk(limited) < totalInk(c) - 0.5)
        o.warn(
          `Exact CMYK ${formatCmyk(c)} for ${hex} is over the profile's ${o.engine.inkLimit}% ink limit, so it prints as ${formatCmyk(limited)}.`,
        )
      this.swatches[rgbToHex(hexToRgb(hex))] = limited
    }
    pdf.svgColors = (r, g, b) => this.color(rgbToHex([r, g, b]))
  }

  /** The CMYK a colour prints as; `size` (mm) applies the black rule to fills. */
  color(hex: string, size?: { w: number; h: number }): Cmyk {
    const key = rgbToHex(hexToRgb(hex))
    const exact = this.swatches[key]
    if (exact) return exact
    if (isBlack(key)) return size ? blackFor(size.w, size.h) : PLAIN_BLACK
    return this.o.engine.cmyk(key)
  }

  private point(x: number, y: number) {
    const p = apply(this.ctm, x, y)
    const b = this.box
    b.x0 = Math.min(b.x0, p.x)
    b.y0 = Math.min(b.y0, p.y)
    b.x1 = Math.max(b.x1, p.x)
    b.y1 = Math.max(b.y1, p.y)
  }
  private paint(how: 'fill' | 'stroke' | 'fillStroke' | 'clip') {
    const b = this.box
    const size = b.x1 >= b.x0 ? { w: b.x1 - b.x0, h: b.y1 - b.y0 } : { w: 0, h: 0 }
    if (how === 'fill' || how === 'fillStroke') this.pdf.fillCmyk(this.color(this.fillHex, size))
    if (how === 'stroke' || how === 'fillStroke') this.pdf.strokeCmyk(this.color(this.strokeHex))
    for (const op of this.path) op(this.pdf)
    this.pdf[how]()
    this.path = []
    this.box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  }

  save() {
    this.stack.push(this.ctm)
    this.pdf.save()
  }
  restore() {
    this.ctm = this.stack.pop() ?? IDENTITY
    this.pdf.restore()
  }
  transform(m: Matrix) {
    this.ctm = multiply(this.ctm, m)
    this.pdf.transform(m)
  }
  opacity(a: number) {
    this.pdf.opacity(a)
  }
  fillColor(hex: string) {
    this.fillHex = hex
  }
  strokeColor(hex: string) {
    this.strokeHex = hex
  }
  lineWidth(mm: number) {
    this.pdf.lineWidth(mm)
  }
  lineJoin(j: 'round' | 'miter') {
    this.pdf.lineJoin(j)
  }
  moveTo(x: number, y: number) {
    this.point(x, y)
    this.path.push((t) => t.moveTo(x, y))
  }
  lineTo(x: number, y: number) {
    this.point(x, y)
    this.path.push((t) => t.lineTo(x, y))
  }
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.point(x1, y1)
    this.point(x2, y2)
    this.point(x, y)
    this.path.push((t) => t.curveTo(x1, y1, x2, y2, x, y))
  }
  closePath() {
    this.path.push((t) => t.closePath())
  }
  rect(x: number, y: number, w: number, h: number) {
    this.point(x, y)
    this.point(x + w, y + h)
    this.point(x + w, y)
    this.point(x, y + h)
    this.path.push((t) => t.rect(x, y, w, h))
  }
  fill() {
    this.paint('fill')
  }
  stroke() {
    this.paint('stroke')
  }
  fillStroke() {
    this.paint('fillStroke')
  }
  clip() {
    this.paint('clip')
  }

  async image(img: PdfImage, x: number, y: number, w: number, h: number) {
    if (img.kind === 'svg' && !svgNeedsRaster(img.svg)) return this.pdf.image(img, x, y, w, h)
    // Pixels needed at the printed size (the transform may scale the box).
    const sx = Math.hypot(this.ctm[0], this.ctm[1]) * w
    const sy = Math.hypot(this.ctm[2], this.ctm[3]) * h
    const dpmm = (img.kind === 'svg' ? SVG_RASTER_DPI : MAX_IMAGE_DPI) / 25.4
    const want = { w: Math.max(1, Math.round(sx * dpmm)), h: Math.max(1, Math.round(sy * dpmm)) }
    const size =
      img.kind === 'raster'
        ? img.widthPx > want.w * 1.05 || img.heightPx > want.h * 1.05
          ? want
          : { w: img.widthPx, h: img.heightPx }
        : want
    const key = `${img.id}:${size.w}x${size.h}`
    let p = this.images.get(key)
    if (!p) {
      if (img.kind === 'svg')
        this.o.warn(
          'An SVG with gradients, photos, masks or filters prints as a 600 DPI CMYK image instead of vector.',
        )
      p = this.toCmyk(img, size.w, size.h)
      this.images.set(key, p)
    }
    const raster = await p
    if (raster) this.pdf.cmykImage(raster, `${key}-cmyk`, x, y, w, h)
  }

  private async toCmyk(img: PdfImage, w: number, h: number): Promise<CmykRaster | undefined> {
    const src = await decode(img)
    if (!src) return undefined
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, 0, 0, w, h)
    const rgba = ctx.getImageData(0, 0, w, h).data
    return { width: w, height: h, cmyk: this.o.engine.pixels(rgba), alpha: alphaOf(rgba) }
  }
}
