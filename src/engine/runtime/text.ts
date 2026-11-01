/**
 * Variables in text: "You have {Gold} coins" shows the number variable Gold.
 * Names match any case. Flags show "yes" or "no". The date is there too:
 * {week}, {month}, {season}, {year} and {date}. Anything else in braces stays as
 * written.
 */
import { dateLabel, dateOf, seasonName, type Calendar } from '../model/calendar'
import type { VarDef } from '../model/game'

export function fillText(
  text: string,
  defs: VarDef[],
  vars: Record<string, boolean | number>,
  cal?: { calendar: Calendar; week: number },
): string {
  if (!text.includes('{')) return text
  const byName = new Map(defs.map((d) => [d.name.trim().toLowerCase(), d]))
  const d = cal ? dateOf(cal.calendar, cal.week) : null
  return text.replace(/\{([^{}]+)\}/g, (m, raw: string) => {
    const name = raw.trim().toLowerCase()
    const def = byName.get(name)
    if (def) {
      const v = vars[def.id] ?? def.initial
      return typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)
    }
    if (cal && d) {
      if (name === 'week') return String(d.weekOfSeason)
      if (name === 'month') return String(d.month)
      if (name === 'season') return seasonName(cal.calendar, d.season)
      if (name === 'year') return String(d.year)
      if (name === 'date') return dateLabel(cal.calendar, cal.week)
    }
    return m
  })
}
