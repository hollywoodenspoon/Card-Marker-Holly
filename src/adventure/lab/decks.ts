import { next, nextInt, shuffle } from '@/playtest/rng'
import type { AsCard } from '../cards'
import { DECK_SIZE, MAX_ACES } from '../deck'
import { buildDeck, type Values } from '../deckgen/build'
import type { LabGame } from './play'

/** Can the cards make a legal Free Company (12 different cards, at most one Ace)? */
export const canBuild = (cards: AsCard[]) =>
  cards.filter((c) => !c.ace).length + Math.min(MAX_ACES, cards.filter((c) => c.ace).length) >=
  DECK_SIZE

/**
 * `n` random legal decks in which every card appears about equally often:
 * cards are dealt from shuffled copies of the pool in turn, and a card that
 * can't go in the current deck (already there, or a second Ace) waits for the next.
 */
export function coverageDecks(cards: AsCard[], n: number, seed: number): string[][] {
  if (!canBuild(cards)) return []
  const queue: AsCard[] = []
  let s = seed
  const refill = () => {
    let order: AsCard[]
    ;[order, s] = shuffle(cards, s)
    queue.push(...order)
  }
  const decks: string[][] = []
  for (let d = 0; d < n; d++) {
    const deck: string[] = []
    let aces = 0
    for (let i = 0; deck.length < DECK_SIZE; i++) {
      if (i >= queue.length) refill()
      const c = queue[i]
      if (deck.includes(c.id) || (c.ace && aces >= MAX_ACES)) continue
      if (c.ace) aces++
      deck.push(c.id)
      queue.splice(i--, 1)
    }
    decks.push(deck)
  }
  return decks
}

/**
 * `games` games between random pairs of `decks` decks, each pair played on
 * both seats with the same seed. Every `checkEvery`th game goes through the checker.
 */
export function randomPairings(
  decks: number,
  games: number,
  seed: number,
  checkEvery = 0,
): LabGame[] {
  const out: LabGame[] = []
  if (decks < 2) return out
  let s = seed
  while (out.length < games) {
    let a: number, b: number, g: number
    ;[a, s] = nextInt(s, decks)
    ;[b, s] = nextInt(s, decks - 1)
    if (b >= a) b++
    ;[g, s] = nextInt(s, 2 ** 31)
    out.push({ a, b, seed: g }, { a: b, b: a, seed: g })
  }
  return mark(out.slice(0, games), checkEvery)
}

/** Every pair of `decks` decks in turn, on both seats, until `games` games. */
export function roundRobin(decks: number, games: number, seed: number, checkEvery = 0) {
  const pairs: [number, number][] = []
  for (let a = 0; a < decks; a++) for (let b = 0; b < decks; b++) if (a !== b) pairs.push([a, b])
  const out: LabGame[] = []
  if (!pairs.length) return out
  let s = seed
  for (let i = 0; out.length < games; i++) {
    const [a, b] = pairs[i % pairs.length]
    let g: number
    ;[g, s] = nextInt(s, 2 ** 31)
    out.push({ a, b, seed: g })
  }
  return mark(out, checkEvery)
}

const mark = (games: LabGame[], every: number) =>
  every > 0 ? games.map((g, i) => (i % every === 0 ? { ...g, check: true } : g)) : games

/** One auto-built Optimal deck, and the cards it could pick from. */
export interface Build {
  cards: string[]
  pool: string[]
}

/**
 * Optimal decks built from many random two-thirds of the pool, each with a
 * little noise on the values (as if from a different league). How often a
 * card is picked when it's there is its pick rate.
 */
export function optimalBuilds(cards: AsCard[], values: Values, n: number, seed: number): Build[] {
  const v = Object.values(values)
  const mean = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, v.length)) || 0.1
  const out: Build[] = []
  let s = seed
  for (let i = 0; i < n; i++) {
    let order: AsCard[]
    ;[order, s] = shuffle(cards, s)
    let pool = order.slice(0, Math.ceil((cards.length * 2) / 3))
    if (!canBuild(pool)) pool = cards
    const noisy: Values = {}
    for (const c of pool) {
      let u: number, w: number
      ;[u, s] = next(s)
      ;[w, s] = next(s)
      // A normal sample (Box–Muller), half the spread.
      const z = Math.sqrt(-2 * Math.log(1 - u)) * Math.cos(2 * Math.PI * w)
      noisy[c.id] = (values[c.id] ?? 0) + z * sd * 0.5
    }
    let bs: number
    ;[bs, s] = nextInt(s, 2 ** 31)
    out.push({ cards: buildDeck(pool, noisy, 'optimal', bs).cards, pool: pool.map((c) => c.id) })
  }
  return out
}

/** Suboptimal decks with different seeds. */
export function suboptimalDecks(cards: AsCard[], values: Values, n: number, seed: number) {
  return Array.from(
    { length: n },
    (_, i) => buildDeck(cards, values, 'suboptimal', (seed + i * 7919) >>> 0).cards,
  )
}

/** The same deck, whatever order its cards are in. */
export const deckKey = (d: string[]) => [...d].sort().join(',')
