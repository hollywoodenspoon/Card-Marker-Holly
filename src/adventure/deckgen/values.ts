import { nextInt, shuffle } from '@/playtest/rng'
import { quickMove } from '../bot/policies'
import type { AsCard } from '../cards'
import { DECK_SIZE, MAX_ACES } from '../deck'
import { apply, createGame } from '../engine'

/**
 * How much each card helps a deck win: a short league of random legal decks
 * played by bots, then a logistic fit of "deck A beat deck B" on which cards
 * each deck holds (as in the tier lists). A card's value is its coefficient,
 * in log-odds of winning; 0 is an average card.
 */

/** A random legal Free Company (12 different cards, at most one Ace). */
export function randomDeck(cards: AsCard[], seed: number): [string[], number] {
  const [order, s] = shuffle(cards, seed)
  const out: string[] = []
  let aces = 0
  for (const c of order) {
    if (out.length === DECK_SIZE) break
    if (c.ace) {
      if (aces >= MAX_ACES) continue
      aces++
    }
    out.push(c.id)
  }
  return [out, s]
}

export interface LeagueGame {
  /** Indexes into the league's decks, as seat 0 and seat 1. */
  a: number
  b: number
  seed: number
}

export interface LeagueResult extends LeagueGame {
  /** The winning seat, or null when nobody won. */
  winner: 0 | 1 | null
}

/** The league's decks and its games (each pair played on both seats). */
export function leaguePlan(cards: AsCard[], decks: number, games: number, seed: number) {
  const list: string[][] = []
  let s = seed
  for (let i = 0; i < decks; i++) {
    let d: string[]
    ;[d, s] = randomDeck(cards, s)
    list.push(d)
  }
  const plan: LeagueGame[] = []
  while (plan.length < games) {
    let a: number, b: number
    ;[a, s] = nextInt(s, decks)
    ;[b, s] = nextInt(s, decks - 1)
    if (b >= a) b++
    let g: number
    ;[g, s] = nextInt(s, 2 ** 31)
    plan.push({ a, b, seed: g }, { a: b, b: a, seed: g })
  }
  return { decks: list, games: plan.slice(0, games) }
}

/**
 * Play some league games (in a worker, a share of the plan). Both sides play
 * the quick rules-of-thumb bot: about ten times faster than Normal, and good
 * enough to tell strong cards from weak ones over many games.
 */
export function playLeague(
  cards: AsCard[],
  decks: string[][],
  games: LeagueGame[],
): LeagueResult[] {
  return games.map((g) => {
    let s = createGame({ cards, decks: [decks[g.a], decks[g.b]], names: ['A', 'B'], seed: g.seed })
    const r = { seed: g.seed ^ 0x9e3779b9 }
    for (let n = 0; n < 4000 && s.step.k !== 'over'; n++) {
      const next = apply(s, quickMove(s, r))
      if (next === s) break
      s = next
    }
    return { ...g, winner: s.winner?.seat ?? null }
  })
}

/**
 * Fit the card values: logistic regression of seat A winning on (cards in A)
 * minus (cards in B), with a seat term and a little L2 so rare cards stay near 0.
 */
export function fitValues(
  cardIds: string[],
  decks: string[][],
  results: LeagueResult[],
  { steps = 400, rate = 0.5, l2 = 0.02 } = {},
): Record<string, number> {
  const index = new Map(cardIds.map((id, i) => [id, i]))
  const rows = results
    .filter((r) => r.winner !== null)
    .map((r) => {
      const x = new Map<number, number>()
      for (const id of decks[r.a]) x.set(index.get(id)!, (x.get(index.get(id)!) ?? 0) + 1)
      for (const id of decks[r.b]) x.set(index.get(id)!, (x.get(index.get(id)!) ?? 0) - 1)
      return { x: [...x].filter(([, v]) => v !== 0), y: r.winner === 0 ? 1 : 0 }
    })
  const w = new Float64Array(cardIds.length)
  let bias = 0
  if (!rows.length) return Object.fromEntries(cardIds.map((id) => [id, 0]))
  for (let step = 0; step < steps; step++) {
    const g = new Float64Array(cardIds.length)
    let gb = 0
    for (const { x, y } of rows) {
      let z = bias
      for (const [i, v] of x) z += w[i] * v
      const err = 1 / (1 + Math.exp(-z)) - y
      gb += err
      for (const [i, v] of x) g[i] += err * v
    }
    for (let i = 0; i < w.length; i++) w[i] -= rate * (g[i] / rows.length + l2 * w[i])
    bias -= (rate * gb) / rows.length
  }
  return Object.fromEntries(cardIds.map((id, i) => [id, w[i]]))
}

/** A short fingerprint of the cards' rule values, so cached values follow card changes. */
export function cardsHash(cards: AsCard[]): string {
  const text = JSON.stringify(
    cards.map((c) => [c.id, c.code, c.fs, c.a, c.d, c.fate, c.ace, c.ability, c.archetypes]),
  )
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36)
}
