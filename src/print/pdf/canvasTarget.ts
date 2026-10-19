import { svgDisplayBlob, svgSize } from '@/assets/imageAssets'
import type { DrawTarget, PdfImage } from './drawTarget'
import type { Matrix } from './matrix'

const decoded = new WeakMap<PdfImage, Promise<CanvasImageSource | undefined>>()

export function decode(img: PdfImage): Promise<CanvasImageSource | undefined> {
  let p = decoded.get(img)
  if (!p) {
    p =
      img.kind === 'raster'
        ? createImageBitmap(
            new Blob([img.data as Uint8Array<ArrayBuffer>], {
              type: img.format === 'PNG' ? 'image/png' : 'image/jpeg',
            }),
          ).catch(() => undefined)
        : loadSvg(img.svg)
    decoded.set(img, p)
  }
  return p
}

/** An SVG with an explicit, large size so it decodes sharply. */
export async function loadSvg(svg: string): Promise<CanvasImageSource | undefined> {
  const { width, height } = svgSize(svg)
  const blob = await svgDisplayBlob(new Blob([svg], { type: 'image/svg+xml' }), width, height)
  const url = URL.createObjectURL(blob)
  return new Promise((resolve) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => resolve(undefined)
    el.src = url
  })
}

/**
 * The card renderer's drawing operations on a 2D canvas, in mm (the caller
 * sets the px-per-mm scale). Used to rasterise a finished card for auto-bleed,
 * so the raster matches the PDF exactly.
 */
export class CanvasTarget implements DrawTarget {
  constructor(private ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
  }

  save() {
    this.ctx.save()
  }
  restore() {
    this.ctx.restore()
  }
  transform(m: Matrix) {
    this.ctx.transform(...m)
  }
  opacity(alpha: number) {
    this.ctx.globalAlpha = alpha
  }
  fillColor(hex: string) {
    this.ctx.fillStyle = hex
  }
  strokeColor(hex: string) {
    this.ctx.strokeStyle = hex
  }
  lineWidth(mm: number) {
    this.ctx.lineWidth = mm
  }
  lineJoin(join: 'round' | 'miter') {
    this.ctx.lineJoin = join
  }
  moveTo(x: number, y: number) {
    this.ctx.moveTo(x, y)
  }
  lineTo(x: number, y: number) {
    this.ctx.lineTo(x, y)
  }
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.ctx.bezierCurveTo(x1, y1, x2, y2, x, y)
  }
  closePath() {
    this.ctx.closePath()
  }
  rect(x: number, y: number, w: number, h: number) {
    this.ctx.rect(x, y, w, h)
  }
  // PDF painting consumes the path; a canvas path stays, so start a new one.
  fill() {
    this.ctx.fill()
    this.ctx.beginPath()
  }
  stroke() {
    this.ctx.stroke()
    this.ctx.beginPath()
  }
  fillStroke() {
    this.ctx.fill()
    this.ctx.stroke()
    this.ctx.beginPath()
  }
  clip() {
    this.ctx.clip()
    this.ctx.beginPath()
  }
  async image(img: PdfImage, x: number, y: number, w: number, h: number) {
    const src = await decode(img)
    if (src) this.ctx.drawImage(src, x, y, w, h)
  }
}
