import { describe, expect, it } from 'vitest'
import { autoSidePixels, builtinTilesetPixels, type Pixels } from './tilesetImage'

const px = (p: Pixels, x: number, y: number) => {
  const o = (y * p.w + x) * 4
  return [p.data[o], p.data[o + 1], p.data[o + 2], p.data[o + 3]]
}

describe('tileset pixels', () => {
  it('draws the built-in set at 8 × 2 tiles of 16 px, fully opaque', () => {
    const p = builtinTilesetPixels()
    expect([p.w, p.h]).toEqual([128, 32])
    for (let i = 3; i < p.data.length; i += 4) expect(p.data[i]).toBe(255)
    // Grass top is green-dominant, water blue-dominant.
    const [r, g, b] = px(p, 8, 8)
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
    const w = px(p, 4 * 16 + 8, 9)
    expect(w[2]).toBeGreaterThan(w[0])
  })

  it('the same every time (deterministic)', () => {
    expect(builtinTilesetPixels().data).toEqual(builtinTilesetPixels().data)
  })

  it('generates a side with the top tile edge as a lip over a darker body', () => {
    const src = builtinTilesetPixels()
    const side = autoSidePixels(src, 16)
    // Lip row 0 of tile 0 = the source tile's bottom-edge rows.
    expect(px(side, 5, 0).slice(0, 3)).toEqual(px(src, 5, 13).slice(0, 3))
    // Body is darker than the source at the same spot.
    const a = px(src, 5, 10)
    const b = px(side, 5, 10)
    expect(b[0] + b[1] + b[2]).toBeLessThan(a[0] + a[1] + a[2])
    expect(b[3]).toBe(a[3])
  })
})
