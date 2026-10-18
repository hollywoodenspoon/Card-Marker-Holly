import { describe, expect, it } from 'vitest'
import { matchPreset, presetSize, withOrientation } from './presets'
import { effectiveDpi, mmToPt, ptToMm } from './units'

describe('units', () => {
  it('converts points and millimetres', () => {
    expect(ptToMm(72)).toBeCloseTo(25.4)
    expect(mmToPt(25.4)).toBeCloseTo(72)
    expect(mmToPt(ptToMm(11))).toBeCloseTo(11)
  })

  it('computes effective DPI of a placed image', () => {
    // 1016 px across 86 mm ≈ 300 dpi
    expect(effectiveDpi(1016, 86)).toBeCloseTo(300.08, 1)
    expect(effectiveDpi(600, 86)).toBeLessThan(300)
  })
})

describe('size presets', () => {
  it('defaults to the 86 × 54 ID card', () => {
    expect(presetSize('id')).toEqual({ presetId: 'id', widthMm: 86, heightMm: 54 })
  })

  it('swaps dimensions for orientation', () => {
    const s = presetSize('poker')
    expect(withOrientation(s, 'landscape')).toMatchObject({ widthMm: 88.9, heightMm: 63.5 })
    expect(withOrientation(s, 'portrait')).toBe(s)
  })

  it('matches presets in either orientation', () => {
    expect(matchPreset(54, 86)).toBe('id')
    expect(matchPreset(63, 88)).toBe('tcg')
    expect(matchPreset(70, 120)).toBe('custom')
  })
})
