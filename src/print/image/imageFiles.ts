/**
 * Card image export: which files to make, their pixel size, and DPI metadata
 * so the images open at their real mm size. Pure, no DOM.
 */
import type { Card, Side } from '@/core/model/types'

export type ImageFormat = 'png' | 'jpg' | 'webp'

export const IMAGE_FORMATS: { id: ImageFormat; label: string; mime: string }[] = [
  { id: 'png', label: 'PNG', mime: 'image/png' },
  { id: 'jpg', label: 'JPG', mime: 'image/jpeg' },
  { id: 'webp', label: 'WebP', mime: 'image/webp' },
]

export interface ImageExportOptions {
  sides: Side[]
  /** false = trimmed card, true = card plus bleed. Both may be chosen. */
  bleeds: boolean[]
  formats: ImageFormat[]
  dpi: number
}

export interface ImageFile {
  card: Card
  side: Side
  withBleed: boolean
  format: ImageFormat
  name: string
}

const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim() || 'Card'

/**
 * One file per card × side × bleed × format. With several cards the names
 * start with the card's position, so duplicate names stay apart and sort in order.
 */
export function imageFiles(cards: Card[], o: ImageExportOptions): ImageFile[] {
  const sorted = [...cards].sort((a, b) => a.order - b.order)
  const pad = String(sorted.length).length
  const out: ImageFile[] = []
  sorted.forEach((card, i) => {
    const prefix = sorted.length > 1 ? `${String(i + 1).padStart(Math.max(2, pad), '0')} ` : ''
    for (const side of o.sides)
      for (const withBleed of o.bleeds)
        for (const format of o.formats)
          out.push({
            card,
            side,
            withBleed,
            format,
            name: `${prefix}${clean(card.name)} - ${side}${withBleed ? ' (bleed)' : ''}.${format}`,
          })
  })
  return out
}

/** Pixel size of an exported card; the bleed is a whole number of pixels on each side. */
export function imagePx(
  card: { w: number; h: number },
  bleedMm: number,
  withBleed: boolean,
  dpi: number,
) {
  const k = dpi / 25.4
  const W = Math.max(1, Math.round(card.w * k))
  const H = Math.max(1, Math.round(card.h * k))
  const B = withBleed ? Math.round(Math.max(0, bleedMm) * k) : 0
  return { W, H, B, width: W + 2 * B, height: H + 2 * B }
}

// ---------- DPI metadata ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Add (or replace) a PNG pHYs chunk so the image opens at `dpi`. */
export function pngWithDpi(png: Uint8Array, dpi: number): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const ppm = Math.round(dpi / 0.0254)
  const chunk = new Uint8Array(21)
  const cv = new DataView(chunk.buffer)
  cv.setUint32(0, 9)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4) // "pHYs"
  cv.setUint32(8, ppm)
  cv.setUint32(12, ppm)
  chunk[16] = 1 // unit: metre
  cv.setUint32(17, crc32(chunk.subarray(4, 17)))
  // Walk chunks after the 8-byte signature; drop any pHYs, insert ours after IHDR.
  const parts: Uint8Array[] = [png.subarray(0, 8)]
  let pos = 8
  while (pos + 8 <= png.length) {
    const len = view.getUint32(pos)
    const type = String.fromCharCode(...png.subarray(pos + 4, pos + 8))
    const end = pos + 12 + len
    if (type !== 'pHYs') parts.push(png.subarray(pos, end))
    if (type === 'IHDR') parts.push(chunk)
    pos = end
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** Set the density in a JPEG's JFIF header (when it has one) to `dpi`. */
export function jpegWithDpi(jpg: Uint8Array, dpi: number): Uint8Array {
  const out = jpg.slice()
  // SOI, then APP0 "JFIF\0": units at offset 13, X/Y density at 14 and 16.
  const isJfif =
    out[0] === 0xff &&
    out[1] === 0xd8 &&
    out[2] === 0xff &&
    out[3] === 0xe0 &&
    String.fromCharCode(...out.subarray(6, 11)) === 'JFIF\0'
  if (!isJfif) return out
  const d = Math.max(1, Math.min(65535, Math.round(dpi)))
  out[13] = 1 // dots per inch
  out[14] = d >> 8
  out[15] = d & 0xff
  out[16] = d >> 8
  out[17] = d & 0xff
  return out
}
