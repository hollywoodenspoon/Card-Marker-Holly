import { describe, expect, it } from 'vitest'
import { clampScale, UI_SCALES } from './uiScale'

describe('UI size', () => {
  it('snaps to the offered sizes', () => {
    expect(clampScale(1)).toBe(1)
    expect(clampScale(1.24)).toBe(1.25)
    expect(clampScale(3)).toBe(1.5)
    expect(clampScale(0.1)).toBe(0.9)
    expect(clampScale(Number.NaN)).toBe(1)
    for (const s of UI_SCALES) expect(clampScale(s)).toBe(s)
  })
})
