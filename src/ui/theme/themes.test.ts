import { describe, expect, it } from 'vitest'
import { themesCss } from '../../../scripts/themesCss'
import themes from './themes.json'
import { DEFAULT_THEME, THEME_GROUPS } from './theme'

/** WCAG contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('colour themes', () => {
  it('have unique ids, a known group and three swatch colours', () => {
    const ids = themes.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of themes) {
      expect(THEME_GROUPS as readonly string[], t.id).toContain(t.group)
      expect(t.swatch, t.id).toHaveLength(3)
    }
    expect(themes.find((t) => t.id === DEFAULT_THEME)?.dark).toBe(true)
  })

  it.each(themes.map((t) => [t.id, t] as const))('%s is readable', (_id, t) => {
    const k = t.tokens
    expect(contrast(k.foreground, k.background), 'text on background').toBeGreaterThanOrEqual(7)
    expect(contrast(k.foreground, k.panel), 'text on panels').toBeGreaterThanOrEqual(7)
    expect(contrast(k.mutedForeground, k.panel), 'secondary text').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.mutedForeground, k.background), 'secondary text').toBeGreaterThanOrEqual(4.5)
    expect(contrast(k.accentForeground, k.accent), 'button text').toBeGreaterThanOrEqual(4.5)
    // The accent is also used for selected text; themes whose accent is a fill colour
    // (Chocobo yellow) give the rail its own selected-text colour instead.
    const decor = (t as { decor?: { railActiveForeground?: string } }).decor
    if (!decor?.railActiveForeground)
      expect(contrast(k.accent, k.panel), 'accent on panels').toBeGreaterThanOrEqual(3)
  })

  it('makes one CSS block per theme with a neutral canvas', () => {
    const css = themesCss()
    for (const t of themes) expect(css).toContain(`[data-theme='${t.id}']`)
    expect(css.match(/--canvas: oklch\(0\.\d+ 0 0\)/g)).toHaveLength(themes.length)
  })
})
