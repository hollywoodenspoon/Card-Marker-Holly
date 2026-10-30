import { afterEach, describe, expect, it, vi } from 'vitest'
import { clampWidth, dragWidth, loadWidth, saveWidth } from './panelSize'

const l = { min: 200, max: 600, initial: 340 }

describe('panel widths', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps widths inside the panel limits', () => {
    expect(clampWidth(100, l)).toBe(200)
    expect(clampWidth(900, l)).toBe(600)
    expect(clampWidth(333.6, l)).toBe(334)
    expect(clampWidth(Number.NaN, l)).toBe(340)
  })

  it('grows a left panel to the right and a right panel to the left', () => {
    expect(dragWidth(340, 60, 'left', 1, l)).toBe(400)
    expect(dragWidth(340, 60, 'right', 1, l)).toBe(280)
    // At 125 % UI size, the same 100 screen px is 80 unscaled px.
    expect(dragWidth(340, 100, 'left', 1.25, l)).toBe(420)
    expect(dragWidth(340, -1000, 'left', 1, l)).toBe(200)
  })

  it('saves and restores a width, and forgets it on reset', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    expect(loadWidth('cards-left', l)).toBe(340)
    saveWidth('cards-left', 455.4)
    expect(store.get('cardmaker.panel.cards-left')).toBe('455')
    expect(loadWidth('cards-left', l)).toBe(455)
    store.set('cardmaker.panel.cards-left', '5000')
    expect(loadWidth('cards-left', l)).toBe(600)
    saveWidth('cards-left', null)
    expect(loadWidth('cards-left', l)).toBe(340)
  })

  it('falls back to the initial width without storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadWidth('x', l)).toBe(340)
  })
})
