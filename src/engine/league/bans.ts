/** The ban list: what the top decks of watched tournaments use, and what gets banned. */
import type { BanRules } from '../model/league'
import type { ResultLog } from './worldState'

/** Percent of the recent top decks (the last `recent` watched results) that run each card. */
export function usageOf(results: ResultLog[], recent = 6): Record<string, number> {
  const decks = results.slice(-recent).flatMap((r) => r.decks)
  const out: Record<string, number> = {}
  if (!decks.length) return out
  for (const d of decks) for (const id of new Set(d)) out[id] = (out[id] ?? 0) + 1
  for (const id of Object.keys(out)) out[id] = Math.round((out[id] / decks.length) * 100)
  return out
}

/**
 * The cards the next update bans: cards the designer banned by hand, then the
 * most used in top decks (at least `minShare` percent), up to `perUpdate`.
 */
export function pickBans(rules: BanRules, usage: Record<string, number>, banned: string[]): string[] {
  const have = new Set(banned)
  const hand = rules.handBanned.filter((id) => !have.has(id))
  const auto = Object.entries(usage)
    .filter(([id, share]) => !have.has(id) && !hand.includes(id) && share >= rules.minShare)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, rules.perUpdate))
    .map(([id]) => id)
  return [...hand, ...auto]
}
