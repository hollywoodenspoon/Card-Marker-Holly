import { describe, expect, it } from 'vitest'
import { matchPreset, presetSize, withOrientation } from './presets'
import {
  effectiveDpi,
  formatSize,
  fromDisplay,
  mmPerUnit,
  mmToPt,
  ptToMm,
  toDisplay,
} from './units'

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
  it('defaults to the portrait 54 × 86 ID card', () => {
    expect(presetSize('id')).toEqual({ presetId: 'id', widthMm: 54, heightMm: 86 })
  })

  it('swaps dimensions for orientation', () => {
    const s = presetSize('poker')
    expect(withOrientation(s, 'landscape')).toMatchObject({ widthMm: 88.9, heightMm: 63.5 })
    expect(withOrientation(s, 'portrait')).toBe(s)
  })

  it('matches presets in either orientation', () => {
    expect(matchPreset(54, 86)).toBe('id')
    expect(matchPreset(86, 54)).toBe('id')
    expect(matchPreset(63, 88)).toBe('tcg')
    expect(matchPreset(70, 120)).toBe('tarot')
    expect(matchPreset(86, 59)).toBe('japanese')
    expect(matchPreset(71, 121)).toBe('custom')
  })
})

describe('display units', () => {
  const inch = { unit: 'in' as const, ppi: 300 }
  const px = { unit: 'px' as const, ppi: 300 }
  it('converts mm to and from each unit', () => {
    expect(toDisplay(25.4, inch)).toBeCloseTo(1)
    expect(toDisplay(59, inch)).toBeCloseTo(2.3228, 3)
    expect(Math.round(toDisplay(59, px))).toBe(697)
    expect(Math.round(toDisplay(86, px))).toBe(1016)
    expect(toDisplay(12, { unit: 'cm', ppi: 300 })).toBeCloseTo(1.2)
    expect(fromDisplay(697, px)).toBeCloseTo(59.0, 0)
    expect(fromDisplay(toDisplay(33.3, inch), inch)).toBeCloseTo(33.3)
    // a bad ppi falls back to the default
    expect(mmPerUnit({ unit: 'px', ppi: 0 })).toBeCloseTo(25.4 / 300)
  })
  it('formats sizes', () => {
    expect(formatSize(59, 86, inch)).toBe('2.32 × 3.39 in')
    expect(formatSize(59, 86, px)).toBe('697 × 1016 px')
    expect(formatSize(54, 86, { unit: 'mm', ppi: 300 })).toBe('54 × 86 mm')
    expect(formatSize(25.4 / 3, 50.8, px)).toBe('100 × 600 px')
  })
})
