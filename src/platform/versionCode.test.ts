import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS build script
import { versionCode } from '../../scripts/versionCode.mjs'

const code = versionCode as (v: string) => number

describe('Android versionCode', () => {
  it('maps versions to codes', () => {
    expect(code('0.1.0-alpha.1')).toBe(10001)
    expect(code('0.1.0-beta.2')).toBe(10042)
    expect(code('0.1.0-rc.1')).toBe(10081)
    expect(code('0.1.0')).toBe(10099)
    expect(code('1.0.0')).toBe(1000099)
  })
  it('always grows with the version', () => {
    const order = [
      '0.1.0-alpha.1',
      '0.1.0-alpha.2',
      '0.1.0-alpha.39',
      '0.1.0-beta.1',
      '0.1.0-rc.1',
      '0.1.0-rc.18',
      '0.1.0',
      '0.1.1-alpha.1',
      '0.1.1',
      '0.2.0',
      '1.0.0-alpha.1',
      '1.0.0',
      '10.99.99',
    ]
    const codes = order.map(code)
    for (let i = 1; i < codes.length; i++) expect(codes[i]).toBeGreaterThan(codes[i - 1])
  })
  it('refuses versions that would not fit', () => {
    expect(() => code('0.1.0-alpha.40')).toThrow()
    expect(() => code('0.100.0')).toThrow()
    expect(() => code('1.0')).toThrow()
    expect(() => code('0.1.0-dev.1')).toThrow()
  })
})
