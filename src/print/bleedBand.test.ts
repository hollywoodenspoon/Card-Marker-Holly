import { describe, expect, it } from 'vitest'
import { bleedRegions, type PxRect } from './bleedBand'

const area = (r: PxRect) => r.w * r.h
const overlaps = (a: PxRect, b: PxRect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('bleed regions', () => {
  const W = 540
  const H = 860
  const B = 30

  for (const mode of ['mirror', 'stretch'] as const) {
    it(`${mode}: tiles the bleed exactly, leaving the card area empty`, () => {
      const rs = bleedRegions(W, H, B, mode)
      expect(rs).toHaveLength(8)
      const card = { x: B, y: B, w: W, h: H }
      for (const r of rs) expect(overlaps(r.dst, card)).toBe(false)
      for (let i = 0; i < rs.length; i++)
        for (let j = i + 1; j < rs.length; j++) expect(overlaps(rs[i].dst, rs[j].dst)).toBe(false)
      const total = rs.reduce((n, r) => n + area(r.dst), 0)
      expect(total).toBe((W + 2 * B) * (H + 2 * B) - W * H)
      // every source lies inside the card raster
      for (const r of rs) {
        expect(r.src.x >= 0 && r.src.y >= 0).toBe(true)
        expect(r.src.x + r.src.w <= W && r.src.y + r.src.h <= H).toBe(true)
      }
    })
  }

  it('mirror reflects the outer strip next to each edge', () => {
    const [left, right, top, bottom, tl] = bleedRegions(W, H, B, 'mirror')
    expect(left).toEqual({
      src: { x: 0, y: 0, w: B, h: H },
      dst: { x: 0, y: B, w: B, h: H },
      flipX: true,
      flipY: false,
    })
    expect(right.src).toEqual({ x: W - B, y: 0, w: B, h: H })
    expect(right.dst).toEqual({ x: B + W, y: B, w: B, h: H })
    expect(top).toMatchObject({ src: { x: 0, y: 0, w: W, h: B }, flipX: false, flipY: true })
    expect(bottom.src.y).toBe(H - B)
    expect(tl).toMatchObject({ src: { x: 0, y: 0, w: B, h: B }, flipX: true, flipY: true })
  })

  it('stretch repeats the outermost pixel row without flipping', () => {
    const [left, right, , bottom, , , , br] = bleedRegions(W, H, B, 'stretch')
    expect(left.src).toEqual({ x: 0, y: 0, w: 1, h: H })
    expect(right.src).toEqual({ x: W - 1, y: 0, w: 1, h: H })
    expect(bottom.src).toEqual({ x: 0, y: H - 1, w: W, h: 1 })
    expect(br.src).toEqual({ x: W - 1, y: H - 1, w: 1, h: 1 })
    expect(left.flipX || br.flipY).toBe(false)
  })

  it('handles a bleed wider than the card and no bleed', () => {
    const [left] = bleedRegions(20, 20, 50, 'mirror')
    expect(left.src.w).toBe(20)
    expect(left.dst.w).toBe(50)
    expect(bleedRegions(W, H, 0, 'mirror')).toEqual([])
  })
})
