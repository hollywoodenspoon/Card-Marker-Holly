import type { DrawTarget, PdfImage } from './drawTarget'
import { apply, IDENTITY, multiply, type Matrix } from './matrix'

export type Op =
  | { op: 'rect'; x: number; y: number; w: number; h: number }
  | { op: 'image'; id: string; x: number; y: number; w: number; h: number }
  | { op: 'fill' | 'stroke' | 'fillStroke' | 'clip'; color?: string; alpha: number }
  | { op: 'point'; x: number; y: number }

/**
 * Test double: records geometry in page coordinates (the current transform
 * applied), so tests can check where things land on the sheet.
 */
export class RecordingTarget implements DrawTarget {
  ops: Op[] = []
  private m: Matrix = IDENTITY
  private stack: { m: Matrix; alpha: number; fill: string; stroke: string }[] = []
  private alpha = 1
  private fillC = '#000000'
  private strokeC = '#000000'

  save() {
    this.stack.push({ m: this.m, alpha: this.alpha, fill: this.fillC, stroke: this.strokeC })
  }
  restore() {
    const s = this.stack.pop()
    if (s) ({ m: this.m, alpha: this.alpha, fill: this.fillC, stroke: this.strokeC } = s)
  }
  transform(m: Matrix) {
    this.m = multiply(this.m, m)
  }
  opacity(a: number) {
    this.alpha = a
  }
  fillColor(c: string) {
    this.fillC = c
  }
  strokeColor(c: string) {
    this.strokeC = c
  }
  lineWidth() {}
  private pt(x: number, y: number) {
    const p = apply(this.m, x, y)
    this.ops.push({ op: 'point', ...p })
  }
  moveTo(x: number, y: number) {
    this.pt(x, y)
  }
  lineTo(x: number, y: number) {
    this.pt(x, y)
  }
  curveTo(_x1: number, _y1: number, _x2: number, _y2: number, x: number, y: number) {
    this.pt(x, y)
  }
  closePath() {}
  rect(x: number, y: number, w: number, h: number) {
    const a = apply(this.m, x, y)
    const b = apply(this.m, x + w, y + h)
    this.ops.push({
      op: 'rect',
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.abs(b.y - a.y),
    })
  }
  fill() {
    this.ops.push({ op: 'fill', color: this.fillC, alpha: this.alpha })
  }
  stroke() {
    this.ops.push({ op: 'stroke', color: this.strokeC, alpha: this.alpha })
  }
  fillStroke() {
    this.ops.push({ op: 'fillStroke', color: this.fillC, alpha: this.alpha })
  }
  clip() {
    this.ops.push({ op: 'clip', alpha: this.alpha })
  }
  async image(img: PdfImage, x: number, y: number, w: number, h: number) {
    const a = apply(this.m, x, y)
    const b = apply(this.m, x + w, y + h)
    this.ops.push({
      op: 'image',
      id: img.id,
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.abs(b.y - a.y),
    })
  }
}
