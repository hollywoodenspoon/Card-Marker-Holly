import type { Matrix } from './matrix'

/** A picture to place: raster bytes (PNG/JPEG) or SVG markup (kept vector). */
export type PdfImage =
  | {
      kind: 'raster'
      id: string
      format: 'PNG' | 'JPEG'
      data: Uint8Array
      widthPx: number
      heightPx: number
    }
  | { kind: 'svg'; id: string; svg: string }

/**
 * The drawing operations the card renderer needs, in mm with a y-down,
 * top-left origin. jsPDF implements it for RGB PDF; another target (e.g. a
 * CMYK writer) could be added without touching the renderer.
 */
export interface DrawTarget {
  save(): void
  restore(): void
  /** Concatenate a transform onto the current one. */
  transform(m: Matrix): void
  /** Absolute opacity for following fills, strokes and images. */
  opacity(alpha: number): void
  fillColor(hex: string): void
  strokeColor(hex: string): void
  lineWidth(mm: number): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void
  closePath(): void
  rect(x: number, y: number, w: number, h: number): void
  fill(): void
  stroke(): void
  fillStroke(): void
  /** Intersect the clip with the current path (and consume it). */
  clip(): void
  image(img: PdfImage, x: number, y: number, w: number, h: number): Promise<void>
}

// ---------- path helpers shared by renderers ----------

const K = 0.5522847498 // circle approximation with cubic Béziers

export function ellipsePath(t: DrawTarget, x: number, y: number, w: number, h: number) {
  const rx = w / 2
  const ry = h / 2
  const cx = x + rx
  const cy = y + ry
  t.moveTo(cx + rx, cy)
  t.curveTo(cx + rx, cy + ry * K, cx + rx * K, cy + ry, cx, cy + ry)
  t.curveTo(cx - rx * K, cy + ry, cx - rx, cy + ry * K, cx - rx, cy)
  t.curveTo(cx - rx, cy - ry * K, cx - rx * K, cy - ry, cx, cy - ry)
  t.curveTo(cx + rx * K, cy - ry, cx + rx, cy - ry * K, cx + rx, cy)
  t.closePath()
}

export function roundedRectPath(
  t: DrawTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  if (rr <= 0) return t.rect(x, y, w, h)
  const k = rr * K
  t.moveTo(x + rr, y)
  t.lineTo(x + w - rr, y)
  t.curveTo(x + w - rr + k, y, x + w, y + rr - k, x + w, y + rr)
  t.lineTo(x + w, y + h - rr)
  t.curveTo(x + w, y + h - rr + k, x + w - rr + k, y + h, x + w - rr, y + h)
  t.lineTo(x + rr, y + h)
  t.curveTo(x + rr - k, y + h, x, y + h - rr + k, x, y + h - rr)
  t.lineTo(x, y + rr)
  t.curveTo(x, y + rr - k, x + rr - k, y, x + rr, y)
  t.closePath()
}
