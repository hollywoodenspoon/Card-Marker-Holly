import type { BotLevel } from '@/adventure/bot'
import type { AsCard } from '@/adventure/cards'
import { buildDeck, type Values } from '@/adventure/deckgen/build'
import { climb } from '@/adventure/deckgen/climb'
import type { DeckgenJob } from '@/adventure/deckgen/deckgen.worker'
import {
  cardsHash,
  fitValues,
  leaguePlan,
  type LeagueGame,
  type LeagueResult,
} from '@/adventure/deckgen/values'
import { playtestDb } from '@/playtest/library'
import { runJobs } from '../workerPool'

/** League size for the card values: enough for a stable fit, quick bots, under a minute on a phone. */
const LEAGUE_DECKS = 60
const LEAGUE_GAMES = 1600
const CHUNK = 40

const deckgenWorker = () =>
  new Worker(new URL('../../adventure/deckgen/deckgen.worker.ts', import.meta.url), {
    type: 'module',
  })

/** A job without its id (the pool numbers them). */
type Job = DeckgenJob extends infer J ? (J extends DeckgenJob ? Omit<J, 'id'> : never) : never

/**
 * The pack's card values: from the cache when the cards haven't changed,
 * otherwise a fresh league (with progress from 0 to 1).
 */
export async function cardValues(
  packId: string,
  cards: AsCard[],
  onProgress?: (part: number) => void,
  stopped?: () => boolean,
): Promise<Values | null> {
  const key = `${packId}:${cardsHash(cards)}`
  const db = playtestDb()
  const cached = await db.cardValues.get(key)
  if (cached) return cached.values
  const plan = leaguePlan(cards, LEAGUE_DECKS, LEAGUE_GAMES, 20261022)
  const chunks: LeagueGame[][] = []
  for (let i = 0; i < plan.games.length; i += CHUNK) chunks.push(plan.games.slice(i, i + CHUNK))
  const parts = await runJobs<LeagueResult[]>(
    deckgenWorker,
    chunks.map((games): Job => ({ kind: 'league', cards, decks: plan.decks, games })),
    'results',
    (done) => onProgress?.(done / chunks.length),
    stopped,
  )
  if (stopped?.()) return null
  const values = fitValues(
    cards.map((c) => c.id),
    plan.decks,
    parts.flat(),
  )
  await db.cardValues.put({ key, packId, values, games: LEAGUE_GAMES, savedAt: Date.now() })
  return values
}

/**
 * Very optimal: the optimal deck improved by played games against a gauntlet
 * (the pack's decks and the optimal deck itself), with progress from 0 to 1.
 */
export async function veryOptimalDeck(
  cards: AsCard[],
  values: Values,
  gauntlet: string[][],
  seed: number,
  onProgress?: (part: number) => void,
  stopped?: () => boolean,
  { steps = 16, seeds = 2, level = 'easy' as BotLevel } = {},
): Promise<string[]> {
  const start = buildDeck(cards, values, 'optimal', seed).cards
  const field = [...gauntlet, start]
  const gameSeeds = Array.from({ length: seeds }, (_, i) => (seed * 7919 + i * 104729) >>> 0)
  const evaluate = async (deck: string[]) => {
    const scores = await runJobs<[number, number]>(
      deckgenWorker,
      field.map((g): Job => ({
        kind: 'gauntlet',
        cards,
        deck,
        gauntlet: [g],
        seeds: gameSeeds,
        level,
      })),
      'score',
    )
    const [w, n] = scores.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0])
    return n ? w / n : 0
  }
  const r = await climb(start, cards, values, {
    steps,
    seed,
    evaluate,
    onStep: (done) => onProgress?.(done / steps),
    stopped,
  })
  return r.deck
}
