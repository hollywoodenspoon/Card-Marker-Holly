/**
 * Plain CMYK helpers for print output: no colour engine needed. Values are
 * 0–1 per ink; settings and the UI show them as percentages.
 */

export type Cmyk = [c: number, m: number, y: number, k: number]
export type Rgb = [r: number, g: number, b: number]

/** Black text and thin lines: one ink, so nothing can print out of register. */
export const PLAIN_BLACK: Cmyk = [0, 0, 0, 1]
/** Large black areas: a deeper black with some of each ink under the K (total 240%). */
export const RICH_BLACK: Cmyk = [0.6, 0.4, 0.4, 1]
/** A black fill gets rich black when both of its sides are at least this long. */
export const RICH_BLACK_MIN_MM = 10

/** "#rgb", "#rrggbb" or "#rrggbbaa" to 0–255 RGB (alpha is ignored; opacity is separate). */
export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3 || h.length === 4)
    h = h
      .slice(0, 3)
      .split('')
      .map((c) => c + c)
      .join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (h.length < 6 || Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgbToHex = ([r, g, b]: Rgb) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** Pure (or all but pure) black, the colour that gets the black rules below. */
export function isBlack(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  return r <= 2 && g <= 2 && b <= 2
}

/** The CMYK for black at a printed size: rich for big areas, plain for text and lines. */
export function blackFor(wMm: number, hMm: number): Cmyk {
  return Math.min(wMm, hMm) >= RICH_BLACK_MIN_MM ? RICH_BLACK : PLAIN_BLACK
}

/** Total ink coverage, in percent (0–400). */
export const totalInk = (c: Cmyk) => (c[0] + c[1] + c[2] + c[3]) * 100

/**
 * Keep coverage at or under `limitPct` by taking cyan, magenta and yellow down
 * evenly; black stays, so the colour keeps its darkness.
 */
export function limitInk(c: Cmyk, limitPct: number): Cmyk {
  const total = totalInk(c)
  if (total <= limitPct) return c
  const cmy = (c[0] + c[1] + c[2]) * 100
  const room = Math.max(0, limitPct - c[3] * 100)
  const f = cmy > 0 ? room / cmy : 0
  return [c[0] * f, c[1] * f, c[2] * f, c[3]]
}

/** "0/40/100/0" or "0 40 100 0" (percent) to CMYK; null when it can't be read. */
export function parseCmyk(text: string): Cmyk | null {
  const parts = text
    .trim()
    .split(/[\s/,;]+/)
    .filter(Boolean)
  if (parts.length !== 4) return null
  const v = parts.map((p) => Number(p.replace(/%$/, '')))
  if (v.some((x) => !Number.isFinite(x) || x < 0 || x > 100)) return null
  return v.map((x) => x / 100) as Cmyk
}

/** CMYK as "0/40/100/0" (whole percent). */
export const formatCmyk = (c: Cmyk) => c.map((v) => Math.round(v * 100)).join('/')

// ---------- colour difference, for the out-of-range warning ----------

const lin = (v: number) => {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389) / 27 / 116 + 16 / 116)

/** sRGB (0–255) to CIE L*a*b* (D65). */
export function rgbToLab([r, g, b]: Rgb): [number, number, number] {
  const R = lin(r)
  const G = lin(g)
  const B = lin(b)
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883
  const fy = f(y)
  return [116 * fy - 16, 500 * (f(x) - fy), 200 * (fy - f(z))]
}

/** Colour difference (CIE76). About 2 is just visible; 10 or more is clearly different. */
export function deltaE(a: Rgb, b: Rgb): number {
  const p = rgbToLab(a)
  const q = rgbToLab(b)
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

/** A colour counts as out of range for print when CMYK changes it by at least this much. */
export const OUT_OF_RANGE_DE = 10
