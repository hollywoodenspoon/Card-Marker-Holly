import { describe, expect, it } from 'vitest'
import {
  blackFor,
  deltaE,
  formatCmyk,
  hexToRgb,
  isBlack,
  limitInk,
  parseCmyk,
  PLAIN_BLACK,
  RICH_BLACK,
  rgbToHex,
  totalInk,
} from './cmyk'

describe('CMYK helpers', () => {
  it('read hex colours in every short and long form', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0])
    expect(hexToRgb('#f80')).toEqual([255, 136, 0])
    expect(hexToRgb('#ff800080')).toEqual([255, 128, 0])
    expect(hexToRgb('nonsense')).toEqual([0, 0, 0])
    expect(rgbToHex([255, 128, 0])).toBe('#ff8000')
  })

  it('give black text plain black and big black areas rich black', () => {
    expect(isBlack('#000000')).toBe(true)
    expect(isBlack('#020202')).toBe(true)
    expect(isBlack('#101010')).toBe(false)
    expect(blackFor(3, 40)).toEqual(PLAIN_BLACK)
    expect(blackFor(10, 12)).toEqual(RICH_BLACK)
    expect(totalInk(RICH_BLACK)).toBeCloseTo(240)
  })

  it('limit total ink by taking down cyan, magenta and yellow, keeping black', () => {
    const c = limitInk([1, 1, 1, 1], 300)
    expect(totalInk(c)).toBeCloseTo(300)
    expect(c[3]).toBe(1)
    expect(c[0]).toBeCloseTo(2 / 3)
    expect(limitInk([0.2, 0.2, 0.2, 0.5], 300)).toEqual([0.2, 0.2, 0.2, 0.5])
  })

  it('read and write CMYK percentages', () => {
    expect(parseCmyk('0/40/100/0')).toEqual([0, 0.4, 1, 0])
    expect(parseCmyk('60 40 40 100')).toEqual([0.6, 0.4, 0.4, 1])
    expect(parseCmyk('10%, 0%, 0%, 5%')).toEqual([0.1, 0, 0, 0.05])
    expect(parseCmyk('0/40/100')).toBeNull()
    expect(parseCmyk('0/40/120/0')).toBeNull()
    expect(formatCmyk([0, 0.404, 1, 0])).toBe('0/40/100/0')
  })

  it('measure colour difference', () => {
    expect(deltaE([10, 20, 30], [10, 20, 30])).toBe(0)
    expect(deltaE([0, 0, 0], [255, 255, 255])).toBeCloseTo(100, 0)
    expect(deltaE([0, 0, 255], [40, 50, 140])).toBeGreaterThan(10)
  })
})

describe('out-of-range colours', () => {
  it('count coloured pixels that change a lot, skip paper white, and can mark them', async () => {
    const { outOfRange } = await import('./gamut')
    // white paper, a skin tone kept, a blue that dulls, a transparent pixel
    const a = new Uint8ClampedArray([
      255, 255, 255, 255, 224, 172, 140, 255, 0, 0, 255, 255, 0, 0, 255, 0,
    ])
    const b = new Uint8ClampedArray([
      255, 255, 255, 255, 222, 170, 141, 255, 40, 50, 140, 255, 0, 0, 0, 0,
    ])
    expect(outOfRange(a, b)).toBeCloseTo(0.5)
    outOfRange(a, b, true)
    expect([...b.slice(8, 11)]).toEqual([255, 0, 255])
    expect([...b.slice(4, 7)]).toEqual([222, 170, 141])
  })
})
