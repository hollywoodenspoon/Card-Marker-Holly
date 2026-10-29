/**
 * Procedural tile textures for the starter block types. PR1 generates a small
 * pixel pattern per palette colour on a canvas so blocks read as *textured*,
 * not flat — nearest-filtered to stay crisp. The Paint tool (PR2) replaces
 * these with real tile images from an atlas; the keying by block-type id is the
 * same, so that swap is local to this module.
 */
import { CanvasTexture, NearestFilter, SRGBColorSpace, type Texture } from 'three'

const SIZE = 16

/** A deterministic pixel pattern tinted around `hex` (a #rrggbb string). */
function tileCanvas(hex: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  // A cheap value-noise per pixel so the surface has grain without an image file.
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
      const d = (Math.abs(n) - 0.5) * 24
      ctx.fillStyle = `rgb(${clamp(r + d)}, ${clamp(g + d)}, ${clamp(b + d)})`
      ctx.fillRect(x, y, 1, 1)
    }
  return canvas
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

/** A crisp, repeat-ready texture for one block colour. Caller disposes it. */
export function tileTexture(hex: string): Texture {
  const tex = new CanvasTexture(tileCanvas(hex))
  tex.magFilter = NearestFilter
  tex.minFilter = NearestFilter
  tex.colorSpace = SRGBColorSpace
  tex.generateMipmaps = false
  return tex
}
