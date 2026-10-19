/**
 * Auto-bleed geometry. The finished card (trim area only) is rendered to a
 * raster; the bleed around it is filled from the card's own edge, either
 * mirrored (a reflection of the outer strip) or stretched (the outermost
 * pixel row repeated). Pure math in pixels, no DOM.
 */
import type { BleedFill } from '@/core/model/types'

export interface PxRect {
  x: number
  y: number
  w: number
  h: number
}

export interface BleedRegion {
  /** Area of the card raster to copy. */
  src: PxRect
  /** Where it goes in the band (band origin = bleed-box corner). */
  dst: PxRect
  flipX: boolean
  flipY: boolean
}

/**
 * The 8 regions (4 sides, 4 corners) that fill a bleed of `b` px around a
 * card raster of `w` × `h` px. The band is (w + 2b) × (h + 2b), with the card
 * area itself left empty.
 */
export function bleedRegions(
  w: number,
  h: number,
  b: number,
  mode: Exclude<BleedFill, 'off'>,
): BleedRegion[] {
  if (b <= 0 || w <= 0 || h <= 0) return []
  const mirror = mode === 'mirror'
  // Mirror copies a strip as wide as the bleed (or the whole card, if smaller); stretch copies 1 px.
  const sx = mirror ? Math.min(b, w) : 1
  const sy = mirror ? Math.min(b, h) : 1
  const L = 0
  const R = w - sx
  const T = 0
  const B = h - sy
  const out = (src: PxRect, dst: PxRect, fx: boolean, fy: boolean): BleedRegion => ({
    src,
    dst,
    flipX: mirror && fx,
    flipY: mirror && fy,
  })
  return [
    // sides
    out({ x: L, y: 0, w: sx, h }, { x: 0, y: b, w: b, h }, true, false),
    out({ x: R, y: 0, w: sx, h }, { x: b + w, y: b, w: b, h }, true, false),
    out({ x: 0, y: T, w, h: sy }, { x: b, y: 0, w, h: b }, false, true),
    out({ x: 0, y: B, w, h: sy }, { x: b, y: b + h, w, h: b }, false, true),
    // corners
    out({ x: L, y: T, w: sx, h: sy }, { x: 0, y: 0, w: b, h: b }, true, true),
    out({ x: R, y: T, w: sx, h: sy }, { x: b + w, y: 0, w: b, h: b }, true, true),
    out({ x: L, y: B, w: sx, h: sy }, { x: 0, y: b + h, w: b, h: b }, true, true),
    out({ x: R, y: B, w: sx, h: sy }, { x: b + w, y: b + h, w: b, h: b }, true, true),
  ]
}
