/** Duelists the world makes up: names, ratings by level, home regions and decks. */
import { levelOf, type League, type Level } from '../model/league'
import type { LCard } from './cards'
import type { Rng } from './rng'
import type { Duelist } from './worldState'

/** A random deck of `size` cards (at most `copies` of one), from cards that may be used. */
export function npcDeck(cards: LCard[], size: number, rng: Rng, copies = 3): string[] {
  if (!cards.length) return []
  const deck: string[] = []
  const count = new Map<string, number>()
  for (let guard = 0; deck.length < size && guard < size * 20; guard++) {
    const c = rng.pick(cards)
    const n = count.get(c.id) ?? 0
    if (n >= copies) continue
    count.set(c.id, n + 1)
    deck.push(c.id)
  }
  return deck
}

/** A rating inside a level: from its minimum up to the next level's (or a bit over). */
export function ratingIn(league: League, level: Level, rng: Rng): number {
  const sorted = [...league.levels].sort((a, b) => a.minRating - b.minRating)
  const i = sorted.findIndex((l) => l.id === level.id)
  const next = sorted[i + 1]
  const low = i === 0 ? Math.min(level.minRating, league.playerRating - 150) : level.minRating
  const high = next ? next.minRating : level.minRating + 100
  return Math.round(low + rng() * Math.max(1, high - low - 1))
}

export function makeDuelist(
  league: League,
  rng: Rng,
  level: Level,
  cards: LCard[],
  taken: Set<string>,
  region?: string,
): Duelist {
  const { first, last, regions } = league.names
  let name = ''
  for (let tries = 0; tries < 30; tries++) {
    const f = first.length ? rng.pick(first) : 'Duelist'
    const l = last.length ? rng.pick(last) : String(rng.int(1000))
    name = `${f} ${l}`.trim()
    if (!taken.has(name)) break
    if (tries === 29) name = `${name} ${rng.int(99) + 2}`
  }
  taken.add(name)
  return {
    id: `d${rng.int(2 ** 30).toString(36)}${taken.size.toString(36)}`,
    name,
    region: region ?? (regions.length ? rng.pick(regions) : ''),
    rating: ratingIn(league, level, rng),
    deck: npcDeck(cards, league.npcDeckSize, rng),
    flags: [],
    character: null,
    played: 0,
  }
}

/** The starting population: each level's number of duelists, spread over the regions. */
export function startingDuelists(league: League, rng: Rng, cards: LCard[]): Duelist[] {
  const taken = new Set<string>()
  const out: Duelist[] = []
  for (const level of league.levels)
    for (let i = 0; i < level.population; i++) out.push(makeDuelist(league, rng, level, cards, taken))
  return out
}

export const levelName = (league: League, rating: number) => levelOf(league, rating)?.name ?? ''
