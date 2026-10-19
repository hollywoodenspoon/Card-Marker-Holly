import { toGrey } from '../draft'
import { decode } from './canvasTarget'
import type { DrawTarget, PdfImage } from './drawTarget'
import type { Matrix } from './matrix'

/** Resolution for greyscale copies of vector (SVG) images, dots per inch. */
const SVG_GREY_DPI = 300

/** Turn a picture into a greyscale PNG (SVGs are rasterised at their printed size). */
async function greyImage(img: PdfImage, wMm: number, hMm: number): Promise<PdfImage | undefined> {
  const src = await decode(img)
  if (!src) return undefined
  const k = SVG_GREY_DPI / 25.4
  const [w, h] =
    img.kind === 'raster'
      ? [img.widthPx, img.heightPx]
      : [Math.max(1, Math.round(wMm * k)), Math.max(1, Math.round(hMm * k))]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(src, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  const p = data.data
  for (let i = 0; i < p.length; i += 4) {
    const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
    p[i] = p[i + 1] = p[i + 2] = y
  }
  ctx.putImageData(data, 0, 0)
  const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'))
  return {
    kind: 'raster',
    id: `${img.id}-grey-${w}x${h}`,
    format: 'PNG',
    data: new Uint8Array(await blob.arrayBuffer()),
    widthPx: w,
    heightPx: h,
  }
}

/** Wraps another target and prints everything in greyscale (draft printing). */
export class GreyTarget implements DrawTarget {
  private cache = new Map<string, Promise<PdfImage | undefined>>()
  constructor(private inner: DrawTarget) {}

  save() {
    this.inner.save()
  }
  restore() {
    this.inner.restore()
  }
  transform(m: Matrix) {
    this.inner.transform(m)
  }
  opacity(a: number) {
    this.inner.opacity(a)
  }
  fillColor(hex: string) {
    this.inner.fillColor(toGrey(hex))
  }
  strokeColor(hex: string) {
    this.inner.strokeColor(toGrey(hex))
  }
  lineWidth(mm: number) {
    this.inner.lineWidth(mm)
  }
  lineJoin(j: 'round' | 'miter') {
    this.inner.lineJoin(j)
  }
  moveTo(x: number, y: number) {
    this.inner.moveTo(x, y)
  }
  lineTo(x: number, y: number) {
    this.inner.lineTo(x, y)
  }
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.inner.curveTo(x1, y1, x2, y2, x, y)
  }
  closePath() {
    this.inner.closePath()
  }
  rect(x: number, y: number, w: number, h: number) {
    this.inner.rect(x, y, w, h)
  }
  fill() {
    this.inner.fill()
  }
  stroke() {
    this.inner.stroke()
  }
  fillStroke() {
    this.inner.fillStroke()
  }
  clip() {
    this.inner.clip()
  }
  async image(img: PdfImage, x: number, y: number, w: number, h: number) {
    const key = img.kind === 'svg' ? `${img.id}:${w.toFixed(2)}x${h.toFixed(2)}` : img.id
    let g = this.cache.get(key)
    if (!g) {
      g = greyImage(img, w, h)
      this.cache.set(key, g)
    }
    const grey = await g
    if (grey) await this.inner.image(grey, x, y, w, h)
  }
}
