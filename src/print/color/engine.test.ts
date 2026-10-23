import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deltaE, totalInk } from './cmyk'
import { loadColorEngine } from './engine'

const fogra39 = () =>
  new Uint8Array(readFileSync(new URL('./profiles/ISOcoated_v2_eci.icc', import.meta.url)))

describe('the colour engine (FOGRA39)', () => {
  it('opens the built-in profile', async () => {
    const e = await loadColorEngine(fogra39())
    expect(e.description).toBe('ISO Coated v2 (ECI)')
    // FOGRA39's separation keeps total ink at about 330%.
    expect(e.inkLimit).toBeGreaterThan(300)
    expect(e.inkLimit).toBeLessThanOrEqual(340)
  })

  it('converts colours like a print workflow does', async () => {
    const e = await loadColorEngine(fogra39())
    expect(e.cmyk('#ffffff')).toEqual([0, 0, 0, 0])
    // Pure yellow is almost all yellow ink; bright green is cyan and yellow.
    const [c, m, y, k] = e.cmyk('#ffff00')
    expect(y).toBeGreaterThan(0.9)
    expect(c + m + k).toBeLessThan(0.15)
    const g = e.cmyk('#00ff00')
    expect(g[0]).toBeGreaterThan(0.5)
    expect(g[2]).toBeGreaterThan(0.9)
    expect(g[1]).toBeLessThan(0.05)
    // Neutral grey is a balanced mix with some black (FOGRA39's grey balance).
    const grey = e.cmyk('#808080')
    expect(grey[3]).toBeGreaterThan(0.15)
    expect(grey[0]).toBeGreaterThan(grey[1])
    // Every result stays inside the ink limit.
    for (const hex of ['#000000', '#123456', '#ff0000', '#3c1f6e'])
      expect(totalInk(e.cmyk(hex))).toBeLessThanOrEqual(e.inkLimit + 1)
  })

  it('converts pixels and agrees with single colours', async () => {
    const e = await loadColorEngine(fogra39())
    const px = e.pixels(new Uint8ClampedArray([255, 255, 0, 255, 0, 0, 0, 128]))
    expect(px).toHaveLength(8)
    const one = e.cmyk('#ffff00').map((v) => Math.round(v * 255))
    for (let i = 0; i < 4; i++) expect(Math.abs(px[i] - one[i])).toBeLessThanOrEqual(1)
  })

  it('shows how a colour will print: bright blue dulls, skin tones barely change', async () => {
    const e = await loadColorEngine(fogra39())
    expect(deltaE([0, 0, 255], e.proofColor('#0000ff'))).toBeGreaterThan(10)
    expect(deltaE([224, 172, 140], e.proofColor('#e0ac8c'))).toBeLessThan(5)
    const p = e.proof(new Uint8ClampedArray([0, 0, 255, 77]))
    expect(p[3]).toBe(77)
  })

  it('refuses files that are not CMYK profiles', async () => {
    await expect(loadColorEngine(new Uint8Array([1, 2, 3]))).rejects.toThrow(/not an ICC profile/)
  })
})
