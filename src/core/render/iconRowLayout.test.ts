import { describe, expect, it } from 'vitest'
import { iconRowLayout, iconRowSlots } from './iconRowLayout'

const h = { direction: 'horizontal' as const, iconMm: 6, gapMm: 1, fitToBox: true }

describe('iconRowLayout', () => {
  it('centres a horizontal row in its box', () => {
    const r = iconRowLayout({ w: 40, h: 8 }, 3, 1, h)
    // run = 3·6 + 2·1 = 20 → starts at 10
    expect(r.map((i) => i.x)).toEqual([10, 17, 24])
    expect(r.every((i) => i.y === 1 && i.w === 6 && i.h === 6)).toBe(true)
  })

  it('centres a vertical column', () => {
    const r = iconRowLayout({ w: 10, h: 30 }, 2, 1, { ...h, direction: 'vertical' })
    // run = 13 → starts at 8.5; cross start (10 - 6) / 2 = 2
    expect(r.map((i) => [i.x, i.y])).toEqual([
      [2, 8.5],
      [2, 15.5],
    ])
  })

  it('keeps the icon aspect ratio inside its cell', () => {
    const [wide] = iconRowLayout({ w: 40, h: 8 }, 1, 2, h)
    expect(wide).toMatchObject({ w: 6, h: 3, x: 17, y: 2.5 })
    const [tall] = iconRowLayout({ w: 40, h: 8 }, 1, 0.5, h)
    expect(tall).toMatchObject({ w: 3, h: 6 })
  })

  it('shrinks to fit the box', () => {
    const r = iconRowLayout({ w: 20, h: 8 }, 5, 1, h) // run 34 > 20
    const last = r[r.length - 1]
    expect(r[0].x).toBeCloseTo(0)
    expect(last.x + last.w).toBeCloseTo(20)
    expect(r[0].w).toBeCloseTo(6 * (20 / 34))
  })

  it('also shrinks when the icon is taller than the box', () => {
    const r = iconRowLayout({ w: 40, h: 3 }, 1, 1, h)
    expect(r[0].h).toBeCloseTo(3)
  })

  it('overflows when shrink is off', () => {
    const r = iconRowLayout({ w: 20, h: 8 }, 5, 1, { ...h, fitToBox: false })
    expect(r[0].x).toBeLessThan(0)
    expect(r[0].w).toBe(6)
  })

  it('draws nothing for a count of zero', () => {
    expect(iconRowLayout({ w: 20, h: 8 }, 0, 1, h)).toEqual([])
  })
})

describe('iconRowSlots', () => {
  it('puts grey icons after or before the coloured ones', () => {
    expect(iconRowSlots(3, 0)).toEqual([false, false, false])
    expect(iconRowSlots(2, 3)).toEqual([false, false, true, true, true])
    expect(iconRowSlots(2, 2, 'start')).toEqual([true, true, false, false])
    expect(iconRowSlots(0, 2)).toEqual([true, true])
    expect(iconRowSlots(1, -1)).toEqual([false])
  })
})
