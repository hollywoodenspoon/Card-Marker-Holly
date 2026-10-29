import { describe, expect, it } from 'vitest'
import { builtinTileset, gridFor, tileCount, tileUv, type Tileset } from './tileset'

const ts = (tileSize: 16 | 32 | 48, cols: number, rows: number): Tileset => ({
  id: 't',
  name: 't',
  tileSize,
  cols,
  rows,
})

describe('tilesets', () => {
  it('counts tiles that fit an image at each size', () => {
    expect(gridFor(256, 64, 16)).toEqual({ cols: 16, rows: 4 })
    expect(gridFor(256, 64, 32)).toEqual({ cols: 8, rows: 2 })
    expect(gridFor(250, 100, 48)).toEqual({ cols: 5, rows: 2 }) // partial tiles dropped
    expect(tileCount(builtinTileset())).toBe(16)
  })

  it.each([16, 32, 48] as const)('maps a tile to its UV rectangle at %i px', (size) => {
    const t = ts(size, 4, 2)
    const first = tileUv(t, 0)
    expect(first.u0).toBeCloseTo(0, 3)
    expect(first.u1).toBeCloseTo(0.25, 3)
    // Row 0 is the top of the image, so the top of UV space.
    expect(first.v1).toBeCloseTo(1, 3)
    expect(first.v0).toBeCloseTo(0.5, 3)
    const last = tileUv(t, 7)
    expect(last.u0).toBeCloseTo(0.75, 3)
    expect(last.v0).toBeCloseTo(0, 3)
    // Inset keeps neighbours from bleeding in.
    expect(first.u1).toBeLessThan(0.25)
    expect(first.u0).toBeGreaterThan(0)
  })

  it('clamps an out-of-range index', () => {
    const t = ts(16, 2, 1)
    expect(tileUv(t, 99)).toEqual(tileUv(t, 1))
    expect(tileUv(t, -3)).toEqual(tileUv(t, 0))
  })
})
