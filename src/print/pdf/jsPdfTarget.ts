import type { jsPDF } from 'jspdf'
import type { DrawTarget, PdfImage } from './drawTarget'
import type { Matrix } from './matrix'

/**
 * RGB PDF output through jsPDF in "advanced" API mode, where coordinates are
 * in mm with a top-left origin. SVG images go through svg2pdf.js and stay vector.
 */
export class JsPdfTarget implements DrawTarget {
  private gstates = new Map<number, unknown>()
  constructor(
    private doc: jsPDF,
    private svgToPdf: (
      svg: string,
      doc: jsPDF,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => Promise<void>,
  ) {}

  save() {
    this.doc.saveGraphicsState()
  }
  restore() {
    this.doc.restoreGraphicsState()
  }
  transform(m: Matrix) {
    // jsPDF exposes Matrix and GState as constructors on the instance (typed as functions).
    const M = this.doc.Matrix as unknown as new (...v: number[]) => ReturnType<jsPDF['Matrix']>
    this.doc.setCurrentTransformationMatrix(new M(...m))
  }
  opacity(alpha: number) {
    const a = Math.round(alpha * 1000) / 1000
    let g = this.gstates.get(a)
    if (!g) {
      const G = this.doc.GState as unknown as new (p: object) => unknown
      g = new G({ opacity: a, 'stroke-opacity': a })
      this.gstates.set(a, g)
    }
    this.doc.setGState(g)
  }
  fillColor(hex: string) {
    this.doc.setFillColor(hex)
  }
  strokeColor(hex: string) {
    this.doc.setDrawColor(hex)
  }
  lineWidth(mm: number) {
    this.doc.setLineWidth(mm)
  }
  moveTo(x: number, y: number) {
    this.doc.moveTo(x, y)
  }
  lineTo(x: number, y: number) {
    this.doc.lineTo(x, y)
  }
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.doc.curveTo(x1, y1, x2, y2, x, y)
  }
  closePath() {
    this.doc.close()
  }
  rect(x: number, y: number, w: number, h: number) {
    this.doc.rect(x, y, w, h, null)
  }
  fill() {
    this.doc.fill()
  }
  stroke() {
    this.doc.stroke()
  }
  fillStroke() {
    this.doc.fillStroke()
  }
  clip() {
    this.doc.clip()
    this.doc.discardPath()
  }
  async image(img: PdfImage, x: number, y: number, w: number, h: number) {
    if (img.kind === 'svg') return this.svgToPdf(img.svg, this.doc, x, y, w, h)
    // Embedded at full resolution; PNG pixels are Flate-compressed, JPEG kept as-is.
    this.doc.addImage(img.data, img.format, x, y, w, h, img.id, 'FAST')
  }
}
