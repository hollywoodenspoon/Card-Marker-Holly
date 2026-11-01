/**
 * Opening a booster: each card rolls its own rarity by the booster's chances,
 * then a card of that kind (Ace or not) from the booster's pool. Seeded, so the
 * same seed opens the same pack. Pure, no UI.
 */
import { next } from '@/playtest/rng'
import type { Booster } from '../model/economy'

export interface PoolCard {
  id: string
  ace: boolean
}

export interface Pulled {
  id: string
  foil: boolean
  /** The rarity it rolled (its id in the booster). */
  rarity: string
}

/** Picks one rarity by weight (negative weights count as 0). */
export function pickRarity(b: Booster, r: number) {
  const total = b.rarities.reduce((n, x) => n + Math.max(0, x.chance), 0)
  if (total <= 0) return b.rarities[0] ?? null
  let left = r * total
  for (const x of b.rarities) if ((left -= Math.max(0, x.chance)) < 0) return x
  return b.rarities[b.rarities.length - 1]
}

export function openBooster(
  b: Booster,
  pool: PoolCard[],
  seed: number,
): { cards: Pulled[]; seed: number } {
  const out: Pulled[] = []
  let s = seed
  if (!pool.length) return { cards: out, seed: s }
  const size = Math.max(1, Math.floor(b.size) || 1)
  for (let i = 0; i < size; i++) {
    let r: number
    ;[r, s] = next(s)
    const rarity = pickRarity(b, r)
    const kind = rarity ? pool.filter((c) => c.ace === rarity.ace) : pool
    // No card of that kind in the pool: any card, keeping the foil.
    const from = kind.length ? kind : pool
    ;[r, s] = next(s)
    const card = from[Math.floor(r * from.length)]
    out.push({ id: card.id, foil: rarity?.foil ?? false, rarity: rarity?.id ?? '' })
  }
  return { cards: out, seed: s }
}

/** Each rarity's chance as a percentage of all of them. */
export function rarityPercents(b: Booster): Record<string, number> {
  const total = b.rarities.reduce((n, x) => n + Math.max(0, x.chance), 0) || 1
  return Object.fromEntries(b.rarities.map((x) => [x.id, (Math.max(0, x.chance) / total) * 100]))
}
