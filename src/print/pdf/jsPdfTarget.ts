import type { jsPDF } from 'jspdf'
import type { Cmyk } from '../color/cmyk'
import { addCmykImage, type CmykRaster } from './cmykPdf'
import type { DrawTarget, PdfImage } from './drawTarget'
import type { Matrix } from './matrix'

/** Turns an SVG's RGB colours (0–255) into CMYK while it is drawn. */
export type SvgColors = (r: number, g: number, b: number) => Cmyk

export type SvgToPdf = (
  svg: string,
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  colors?: SvgColors,
) => Promise<void>

/**
 * PDF output through jsPDF in "advanced" API mode, where coordinates are in
 * mm with a top-left origin. SVG images go through svg2pdf.js and stay vector.
 * RGB by default; `CmykTarget` drives the CMYK methods below.
 */
export class JsPdfTarget implements DrawTarget {
  private gstates = new Map<number, unknown>()
  /** Set for CMYK output: SVG colours are converted as they are drawn. */
  svgColors?: SvgColors
  constructor(
    readonly doc: jsPDF,
    private svgToPdf: SvgToPdf,
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
  fillCmyk([c, m, y, k]: Cmyk) {
    this.doc.setFillColor(c, m, y, k)
  }
  strokeCmyk([c, m, y, k]: Cmyk) {
    this.doc.setDrawColor(c, m, y, k)
  }
  cmykImage(img: CmykRaster, alias: string, x: number, y: number, w: number, h: number) {
    addCmykImage(this.doc, img, alias, x, y, w, h)
  }
  lineWidth(mm: number) {
    this.doc.setLineWidth(mm)
  }
  lineJoin(join: 'round' | 'miter') {
    this.doc.setLineJoin(join)
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
    if (img.kind === 'svg') return this.svgToPdf(img.svg, this.doc, x, y, w, h, this.svgColors)
    // Embedded at full resolution; PNG pixels are Flate-compressed, JPEG kept as-is.
    this.doc.addImage(img.data, img.format, x, y, w, h, img.id, 'FAST')
  }
}
