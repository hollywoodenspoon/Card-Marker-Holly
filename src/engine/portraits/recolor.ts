/**
 * Recolouring a portrait layer's pixels (RGBA, as from a canvas). Pure maths, so
 * it's tested without a browser.
 * - ramp: a grey-to-colour ramp. Mid grey becomes the colour; darker greys go
 *   toward black and lighter greys toward white, so drawn shading stays.
 * - hue: each pixel takes the colour's hue and keeps its own saturation and
 *   lightness (for layers drawn in colour).
 */
import type { Recolor } from '../model/characters'

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const s = hex.replace('#', '')
  const full = s.length === 3 ? [...s].map((c) => c + c).join('') : s.padEnd(6, '0')
  const n = parseInt(full.slice(0, 6), 16) || 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 0–1 lightness as the eye sees it. */
const luma = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255

export function rampPixel(r: number, g: number, b: number, c: RGB): RGB {
  const l = luma(r, g, b)
  if (l <= 0.5) {
    const k = l / 0.5
    return [c[0] * k, c[1] * k, c[2] * k].map(Math.round) as RGB
  }
  const k = (l - 0.5) / 0.5
  return [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k].map(
    Math.round,
  ) as RGB
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255)) as RGB
}

export function huePixel(r: number, g: number, b: number, c: RGB): RGB {
  const [, s, l] = rgbToHsl(r, g, b)
  const [h] = rgbToHsl(c[0], c[1], c[2])
  return hslToRgb(h, s, l)
}

/** Recolours RGBA pixels in place. Transparent pixels are skipped. */
export function recolorPixels(data: Uint8ClampedArray, mode: Recolor, color: string): void {
  if (mode === 'none') return
  const c = hexToRgb(color)
  const fn = mode === 'ramp' ? rampPixel : huePixel
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const [r, g, b] = fn(data[i], data[i + 1], data[i + 2], c)
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}
