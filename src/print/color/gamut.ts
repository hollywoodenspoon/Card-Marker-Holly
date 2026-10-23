import { OUT_OF_RANGE_DE } from './cmyk'

/**
 * Compare a picture with its CMYK proof (both RGBA, same size): the share of
 * coloured pixels that change by OUT_OF_RANGE_DE or more, the ones that will
 * print noticeably duller. Paper white and empty pixels are left out. With
 * `mark`, those pixels are painted magenta in the proof, to show where they are.
 */
export function outOfRange(
  original: Uint8ClampedArray,
  proof: Uint8ClampedArray,
  mark = false,
): number {
  let counted = 0
  let off = 0
  const limit = OUT_OF_RANGE_DE * OUT_OF_RANGE_DE
  for (let i = 0; i < original.length; i += 4) {
    if (original[i + 3] < 16) continue
    const r = original[i]
    const g = original[i + 1]
    const b = original[i + 2]
    if (r > 250 && g > 250 && b > 250) continue
    counted++
    const p = LAB(r, g, b)
    const q = LAB(proof[i], proof[i + 1], proof[i + 2])
    const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2
    if (d >= limit) {
      off++
      if (mark) {
        proof[i] = 255
        proof[i + 1] = 0
        proof[i + 2] = 255
      }
    }
  }
  return counted ? off / counted : 0
}

// sRGB → linear, by table (this runs on every pixel of the preview).
const LIN = new Float64Array(256).map((_, v) => {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
})
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389) / 27 / 116 + 16 / 116)
function LAB(r: number, g: number, b: number): [number, number, number] {
  const R = LIN[r]
  const G = LIN[g]
  const B = LIN[b]
  const fx = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047)
  const fy = f(0.2126 * R + 0.7152 * G + 0.0722 * B)
  const fz = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}
