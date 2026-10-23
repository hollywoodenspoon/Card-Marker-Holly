import { nextInt } from '@/playtest/rng'
import type { BotLevel } from '../bot'
import { playMatch } from '../sim/sim'
import type { AsCard } from '../cards'
import { DECK_SIZE, MAX_ACES } from '../deck'
import type { Values } from './build'

/**
 * Very optimal: start from the optimal deck, then try swaps and keep a swap
 * only when the deck does better in played games against a gauntlet. The
 * games are played by `evaluate` (a worker pool in the app, playMatch in
 * tests); the same seeds are used for every deck, so decks are compared on
 * the same games.
 */
export interface ClimbOptions {
  steps: number
  seed: number
  /** The deck's win rate (0–1) against the gauntlet. */
  evaluate: (deck: string[]) => Promise<number>
  onStep?: (done: number, best: { deck: string[]; score: number }) => void
  /** Return true to stop early. */
  stopped?: () => boolean
}

export async function climb(
  start: string[],
  cards: AsCard[],
  values: Values,
  o: ClimbOptions,
): Promise<{ deck: string[]; score: number; tried: number }> {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
  let deck = [...start]
  let score = await o.evaluate(deck)
  let s = o.seed
  // Candidates to bring in: the better half of the cards, by value.
  const pool = [...cards]
    .sort((a, b) => (values[b.id] ?? 0) - (values[a.id] ?? 0))
    .slice(0, Math.max(DECK_SIZE + 6, Math.ceil(cards.length / 2)))
  let tried = 0
  for (let step = 0; step < o.steps && !o.stopped?.(); step++) {
    // Take out a weaker card more often than a strong one.
    const byWeak = [...deck].sort((a, b) => (values[a] ?? 0) - (values[b] ?? 0))
    let i: number, j: number
    ;[i, s] = nextInt(s, Math.max(1, Math.ceil(byWeak.length / 2)))
    const out = byWeak[i]
    const options = pool.filter((c) => !deck.includes(c.id))
    if (!options.length) break
    ;[j, s] = nextInt(s, options.length)
    const into = options[j].id
    const next = deck.map((id) => (id === out ? into : id))
    if (next.filter((id) => byId[id]?.ace).length > MAX_ACES) continue
    tried++
    const sc = await o.evaluate(next)
    if (sc > score) {
      deck = next
      score = sc
    }
    o.onStep?.(step + 1, { deck, score })
  }
  return { deck, score, tried }
}

/**
 * A deck's results against a gauntlet: every seed against every gauntlet
 * deck, on both seats. Returns [wins, games].
 */
export function playGauntlet(
  cards: AsCard[],
  deck: string[],
  gauntlet: string[][],
  seeds: number[],
  level: BotLevel = 'easy',
): [number, number] {
  let wins = 0
  let games = 0
  for (const other of gauntlet)
    for (const seed of seeds)
      for (const seat of [0, 1] as const) {
        const decks: [string[], string[]] = seat === 0 ? [deck, other] : [other, deck]
        const m = playMatch({ cards, decks, names: ['A', 'B'], seed }, [level, level])
        games++
        if (m.state.winner?.seat === seat) wins++
      }
  return [wins, games]
}
