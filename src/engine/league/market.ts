/** The card market: prices from base values, use in top decks and how many copies exist. */
import type { Booster } from '../model/economy'
import { rarityKey } from '../model/economy'
import type { MarketRules } from '../model/league'
import type { LCard } from './cards'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Boosters supplied to all stores in a week. */
export function boostersPerWeek(m: MarketRules, weeksPerMonth: number): number {
  const boxes = Math.max(0, m.boxesPerMonth) * Math.max(0, m.stores) * Math.max(0, m.countries)
  return (boxes * Math.max(1, m.perBox)) / Math.max(1, weeksPerMonth)
}

/**
 * Expected new copies per card in a week from the booster supply: each card slot
 * is an Ace or not by the booster's rarities, then any card of that kind.
 */
export function weeklySupply(
  m: MarketRules,
  weeksPerMonth: number,
  booster: Booster | undefined,
  cards: LCard[],
): Record<string, number> {
  const out: Record<string, number> = {}
  if (!booster || !cards.length) return out
  const total = booster.rarities.reduce((n, r) => n + Math.max(0, r.chance), 0) || 1
  const aceShare = booster.rarities.filter((r) => r.ace).reduce((n, r) => n + Math.max(0, r.chance), 0) / total
  const aces = cards.filter((c) => c.ace).length
  const plain = cards.length - aces
  const slots = boostersPerWeek(m, weeksPerMonth) * booster.size
  for (const c of cards) {
    const share = c.ace
      ? aces ? aceShare / aces : 0
      : plain ? (1 - aceShare) / plain : 0
    out[c.id] = slots * share
  }
  return out
}

/** The key of a card's price in the market (foil copies have their own). */
export const priceKey = (id: string, foil: boolean) => (foil ? `${id}*` : id)

/** A price per card, normal and foil: base × demand × scarcity, within the limits. */
export function priceCards(
  m: MarketRules,
  cards: LCard[],
  usage: Record<string, number>,
  supply: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {}
  const copies = cards.map((c) => supply[c.id] ?? 0)
  const avg = copies.reduce((a, b) => a + b, 0) / Math.max(1, copies.length)
  for (const c of cards) {
    const s = supply[c.id] ?? 0
    const relative = s > 0 && avg > 0 ? avg / s : avg > 0 ? 4 : 1
    const scarce = 1 + (m.scarcity * (clamp(relative, 0.25, 4) - 1)) / 3
    const demand = 1 + (m.demand * (usage[c.id] ?? 0)) / 100
    const mult = clamp(demand * scarce, m.minMult, m.maxMult)
    for (const foil of [false, true])
      out[priceKey(c.id, foil)] = Math.max(1, Math.round(m.base[rarityKey(c.ace, foil)] * mult))
  }
  return out
}
