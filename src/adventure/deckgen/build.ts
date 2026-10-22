import { nextInt, shuffle } from '@/playtest/rng'
import type { AsCard } from '../cards'
import { DECK_SIZE, MAX_ACES } from '../deck'

/**
 * Auto-built Free Companies at three levels, from card values (values.ts):
 * - suboptimal: playable but weak, drawn from the lower and middle values;
 * - optimal: the best deck by value plus archetype synergy;
 * - very optimal: optimal, then improved by played games (climb.ts).
 */
export type DeckLevel = 'suboptimal' | 'optimal' | 'veryOptimal'
export const DECK_LEVELS: DeckLevel[] = ['suboptimal', 'optimal', 'veryOptimal']
export const DECK_LEVEL_NAMES: Record<DeckLevel, string> = {
  suboptimal: 'Suboptimal',
  optimal: 'Optimal',
  veryOptimal: 'Very optimal',
}

export type Values = Record<string, number>

/** A card's archetypes: its Archetype_AS list, or the words of its name. */
const archetypesOf = (c: AsCard) =>
  c.archetypes.length ? c.archetypes.map((a) => a.toLowerCase()) : c.name.toLowerCase().split(/\W+/)

/**
 * The archetypes a card's ability asks for ("If a Grave card is also on your
 * field", "a Ghoulish card"): the word before "card" that names an archetype
 * some other card has.
 */
export function wantedArchetypes(c: AsCard, all: AsCard[]): string[] {
  const words = [...c.ability.matchAll(/\b([A-Z][\w-]*) cards?\b/g)].map((m) => m[1].toLowerCase())
  return [...new Set(words)].filter((w) =>
    all.some((o) => o.id !== c.id && archetypesOf(o).includes(w)),
  )
}

/** A deck's score: the card values, plus a bonus for each archetype need the deck meets. */
export function deckScore(
  ids: string[],
  byId: Record<string, AsCard>,
  values: Values,
  bonus: number,
) {
  const cards = ids.map((id) => byId[id]).filter(Boolean)
  let score = 0
  for (const c of cards) {
    score += values[c.id] ?? 0
    for (const w of wantedArchetypes(c, cards)) {
      const n = cards.filter((o) => o.id !== c.id && archetypesOf(o).includes(w)).length
      // Two others make the condition reliable; one makes it possible.
      score += n >= 2 ? bonus : n === 1 ? bonus / 2 : 0
    }
  }
  return score
}

/** The synergy bonus: about half the spread of the card values. */
export function synergyBonus(values: Values) {
  const v = Object.values(values)
  if (!v.length) return 0
  const mean = v.reduce((a, b) => a + b, 0) / v.length
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length)
  return sd * 0.5
}

const legal = (ids: string[], byId: Record<string, AsCard>) =>
  new Set(ids).size === ids.length && ids.filter((id) => byId[id]?.ace).length <= MAX_ACES

export interface BuiltDeck {
  cards: string[]
  /** Why: the main cards, and any archetype the deck builds around. */
  notes: string[]
}

/** Build a deck at the suboptimal or optimal level (very optimal starts from optimal). */
export function buildDeck(
  cards: AsCard[],
  values: Values,
  level: Exclude<DeckLevel, 'veryOptimal'>,
  seed: number,
): BuiltDeck {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
  const ranked = [...cards].sort((a, b) => (values[b.id] ?? 0) - (values[a.id] ?? 0))
  if (level === 'suboptimal') {
    // The lower and middle cards, in a random order: playable, but nothing special.
    const from = ranked.slice(Math.floor(ranked.length * 0.3))
    const pool = from.length >= DECK_SIZE ? from : ranked
    const [order] = shuffle(pool, seed)
    const ids: string[] = []
    for (const c of order) {
      if (ids.length === DECK_SIZE) break
      if (c.ace && ids.some((id) => byId[id].ace)) continue
      ids.push(c.id)
    }
    return { cards: ids, notes: ['Built from the less valued cards: playable, but not tuned.'] }
  }
  const bonus = synergyBonus(values)
  const score = (ids: string[]) => deckScore(ids, byId, values, bonus)
  // Greedy: add the card that raises the score most, then swap while it improves.
  let ids: string[] = []
  while (ids.length < DECK_SIZE && ids.length < cards.length) {
    let best: string | null = null
    let bestScore = -Infinity
    for (const c of ranked) {
      if (ids.includes(c.id)) continue
      const next = [...ids, c.id]
      if (!legal(next, byId)) continue
      const sc = score(next)
      if (sc > bestScore) {
        bestScore = sc
        best = c.id
      }
    }
    if (!best) break
    ids.push(best)
  }
  let s = seed
  for (let pass = 0; pass < 6; pass++) {
    let improved = false
    for (let i = 0; i < ids.length; i++) {
      const base = score(ids)
      for (const c of ranked) {
        if (ids.includes(c.id)) continue
        const next = ids.map((id, k) => (k === i ? c.id : id))
        if (legal(next, byId) && score(next) > base + 1e-9) {
          ids = next
          improved = true
          break
        }
      }
    }
    if (!improved) break
    ;[, s] = nextInt(s, 2)
  }
  return { cards: ids, notes: notesFor(ids, cards, values) }
}

/** A line or two on why a deck looks as it does. */
export function notesFor(ids: string[], cards: AsCard[], values: Values): string[] {
  const deck = cards.filter((c) => ids.includes(c.id))
  const top = [...deck]
    .sort((a, b) => (values[b.id] ?? 0) - (values[a.id] ?? 0))
    .slice(0, 3)
    .map((c) => c.name)
  const notes = [`Strongest picks: ${top.join(', ')}.`]
  const wanted = new Set(deck.flatMap((c) => wantedArchetypes(c, deck)))
  for (const w of wanted) {
    const n = deck.filter((c) => archetypesOf(c).includes(w)).length
    if (n >= 3) notes.push(`Built around ${w[0].toUpperCase()}${w.slice(1)} cards (${n}).`)
  }
  return notes
}
