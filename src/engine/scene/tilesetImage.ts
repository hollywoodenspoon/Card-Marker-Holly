/**
 * Pixels for tilesets, as plain RGBA arrays so they're testable without a DOM:
 * the built-in starter set (drawn by code, so a new map works with no files),
 * and the draft side tiles generated from a tileset's top tiles. The renderer
 * turns these into textures; imported tilesets come from their PNG.
 */
import { BUILTIN, builtinTileset } from '../model/tileset'

export interface Pixels {
  w: number
  h: number
  data: Uint8ClampedArray
}

type RGB = [number, number, number]

/** A small deterministic hash noise in [0, 1). */
const noise = (x: number, y: number, s: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
  return n - Math.floor(n)
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB

/** Draws one 16 px tile of the starter set: `px(x, y)` returns its colour. */
type Painter = (x: number, y: number) => RGB

const grain =
  (base: string, amount: number, seed: number): Painter =>
  (x, y) => {
    const c = hex(base)
    const d = (noise(x, y, seed) - 0.5) * amount
    return [c[0] + d, c[1] + d, c[2] + d]
  }

function painters(): Record<number, Painter> {
  const grass = grain('#5f9a3c', 34, 1)
  const dirt = grain('#8a6240', 30, 2)
  const snow = grain('#e8eef6', 14, 9)
  return {
    [BUILTIN.grassTop]: (x, y) => {
      const c = grass(x, y)
      return noise(x, y, 11) > 0.9 ? [c[0] + 30, c[1] + 40, c[2] + 10] : c
    },
    [BUILTIN.dirt]: (x, y) => {
      const c = dirt(x, y)
      return noise(x, y, 12) > 0.88 ? [c[0] - 30, c[1] - 26, c[2] - 20] : c
    },
    [BUILTIN.stone]: (x, y) => {
      const c = grain('#8d929b', 26, 3)(x, y)
      return noise(x * 2, y, 13) > 0.93 ? [c[0] - 35, c[1] - 35, c[2] - 35] : c
    },
    [BUILTIN.sand]: grain('#d8c287', 22, 4),
    [BUILTIN.water]: (x, y) => {
      const c = grain('#3f78c0', 16, 5)(x, y)
      return (y + Math.round(Math.sin(x * 0.8) * 1.5)) % 6 === 0
        ? [c[0] + 50, c[1] + 60, c[2] + 50]
        : c
    },
    [BUILTIN.grassSide]: (x, y) =>
      y < 4 + Math.round(noise(x, 0, 21) * 2) ? grass(x, y) : dirt(x, y),
    [BUILTIN.stoneBrick]: (x, y) => {
      const row = Math.floor(y / 4)
      const offset = row % 2 ? 4 : 0
      const mortar = y % 4 === 3 || (x + offset) % 8 === 7
      const c = grain('#8d929b', 20, 6)(x, y)
      return mortar ? [c[0] - 45, c[1] - 45, c[2] - 42] : c
    },
    [BUILTIN.wood]: (x, y) => {
      const c = grain('#8b5a2b', 18, 7)(x, y)
      return x % 5 === 0
        ? [c[0] - 30, c[1] - 22, c[2] - 15]
        : [c[0], c[1] + Math.sin(y * 0.9) * 6, c[2]]
    },
    [BUILTIN.snow]: snow,
    [BUILTIN.snowSide]: (x, y) =>
      y < 5 + Math.round(noise(x, 0, 22) * 2) ? snow(x, y) : dirt(x, y),
    [BUILTIN.lava]: (x, y) => {
      const n = noise(x, y, 10)
      return n > 0.75 ? [255, 214, 90] : [220 + n * 30, 70 + n * 60, 20]
    },
    [BUILTIN.path]: (x, y) => {
      const c = grain('#b29469', 22, 14)(x, y)
      return noise(x, y, 15) > 0.9 ? [c[0] + 30, c[1] + 28, c[2] + 24] : c
    },
    [BUILTIN.darkStone]: grain('#4a4d55', 22, 16),
    [BUILTIN.moss]: grain('#3f6b35', 30, 17),
    [BUILTIN.roof]: (x, y) => {
      const c = grain('#a8473a', 18, 18)(x, y)
      return y % 4 === 3 ? [c[0] - 50, c[1] - 25, c[2] - 20] : c
    },
    [BUILTIN.plank]: (x, y) => {
      const c = grain('#a87a48', 16, 19)(x, y)
      return y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 8) % 16 === 0
        ? [c[0] - 40, c[1] - 32, c[2] - 22]
        : c
    },
  }
}

/** The built-in starter tileset (8 × 2 tiles of 16 px). */
export function builtinTilesetPixels(): Pixels {
  const ts = builtinTileset()
  const s = ts.tileSize
  const w = ts.cols * s
  const h = ts.rows * s
  const data = new Uint8ClampedArray(w * h * 4)
  const paint = painters()
  for (let i = 0; i < ts.cols * ts.rows; i++) {
    const p = paint[i] ?? grain('#ff00ff', 0, 0)
    const ox = (i % ts.cols) * s
    const oy = Math.floor(i / ts.cols) * s
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const [r, g, b] = p(x, y)
        const o = ((oy + y) * w + ox + x) * 4
        data[o] = clamp(r)
        data[o + 1] = clamp(g)
        data[o + 2] = clamp(b)
        data[o + 3] = 255
      }
  }
  return { w, h, data }
}

/**
 * Draft side tiles for a whole tileset: for each tile, the top tile's own bottom
 * edge as a lip along the top of the side, over a darker copy of the tile. Good
 * enough to block out a map; draw real sides in Aseprite later.
 */
export function autoSidePixels(src: Pixels, tileSize: number): Pixels {
  const out = new Uint8ClampedArray(src.data.length)
  const lip = Math.max(2, Math.round(tileSize / 5))
  const cols = Math.floor(src.w / tileSize)
  const rows = Math.floor(src.h / tileSize)
  for (let ty = 0; ty < rows; ty++)
    for (let tx = 0; tx < cols; tx++) {
      const ox = tx * tileSize
      const oy = ty * tileSize
      for (let y = 0; y < tileSize; y++)
        for (let x = 0; x < tileSize; x++) {
          const o = ((oy + y) * src.w + ox + x) * 4
          if (y < lip) {
            // The lip: the top tile's last rows, as you'd see its edge from the side.
            const sy = tileSize - lip + y
            const so = ((oy + sy) * src.w + ox + x) * 4
            out[o] = src.data[so]
            out[o + 1] = src.data[so + 1]
            out[o + 2] = src.data[so + 2]
          } else {
            // Below: the tile itself, darker, a little darker again toward the base.
            const f = 0.68 - (0.12 * (y - lip)) / tileSize
            out[o] = src.data[o] * f
            out[o + 1] = src.data[o + 1] * f
            out[o + 2] = src.data[o + 2] * f
          }
          out[o + 3] = src.data[o + 3]
        }
    }
  return { w: src.w, h: src.h, data: out }
}
