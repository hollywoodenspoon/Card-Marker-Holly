import themes from '../src/ui/theme/themes.json' with { type: 'json' }

type Theme = (typeof themes)[number]

const VARS: Record<string, string> = {
  background: '--background',
  foreground: '--foreground',
  panel: '--panel',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  border: '--border',
  input: '--input',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  accentSoft: '--accent-soft',
  ring: '--ring',
}

/**
 * CSS for every colour theme in src/ui/theme/themes.json (one block per
 * `[data-theme]`). The canvas surround stays neutral grey in all of them, so
 * card colours read true. Optional decorations: a glow under the top bar, a
 * tint at the bottom of the left rail, or solid bars (Chocobo).
 */
export function themesCss(): string {
  return themes
    .map((t: Theme) => {
      const k = t.tokens as Record<string, string>
      const d = (t as { decor?: Record<string, string> }).decor ?? {}
      const lines = Object.entries(VARS).map(([key, v]) => `  ${v}: ${k[key]};`)
      lines.push(`  --canvas: ${t.dark ? 'oklch(0.42 0 0)' : 'oklch(0.74 0 0)'};`)
      if (d.topbar) lines.push(`  --topbar-bg: linear-gradient(${d.topbar}, ${d.topbar});`)
      else if (d.glow) {
        lines.push(
          `  --topbar-bg: linear-gradient(to bottom, color-mix(in oklab, ${k.accent} 10%, ${k.panel}), ${k.panel});`,
          `  --topbar-shadow: 0 6px 18px -8px ${d.glow};`,
        )
      }
      if (d.rail) lines.push(`  --rail-bg: linear-gradient(${d.rail}, ${d.rail});`)
      else if (d.railTint)
        lines.push(`  --rail-bg: linear-gradient(to top, ${d.railTint} 0%, ${k.panel} 50%);`)
      if (d.railActiveForeground) lines.push(`  --rail-active-fg: ${d.railActiveForeground};`)
      return `[data-theme='${t.id}'] {\n${lines.join('\n')}\n}`
    })
    .join('\n\n')
}
