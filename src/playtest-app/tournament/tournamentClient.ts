import type { BotLevel } from '@/adventure/bot'
import type { AsCard } from '@/adventure/cards'
import { apply, createGame, type Move, type NewGame } from '@/adventure/engine'
import type { SeriesJob } from '@/adventure/tournament/series'
import {
  currentMatches,
  gameSeed,
  recordGame,
  type GameRecord,
  type Match,
  type Tournament,
} from '@/adventure/tournament/tournament'
import { runJobs } from '../workerPool'

const seriesWorker = () =>
  new Worker(new URL('../../adventure/tournament/series.worker.ts', import.meta.url), {
    type: 'module',
  })

const entrant = (t: Tournament, id: string) => t.entrants.find((e) => e.id === id)!

/** A match both of whose players are bots (it can be simulated). */
export const botMatch = (t: Tournament, m: Match) =>
  m.b !== null && !!entrant(t, m.a).bot && !!entrant(t, m.b).bot

/**
 * Settle the round's open bot-against-bot matches in the worker pool and
 * record them (in match order, so the result doesn't depend on timing).
 */
export async function simulateRound(
  t: Tournament,
  cards: AsCard[],
  onProgress?: (part: number) => void,
): Promise<Tournament> {
  const open = currentMatches(t).filter((m) => m.winner === null && botMatch(t, m))
  if (!open.length) return t
  const jobs: SeriesJob[] = open.map((m) => {
    const a = entrant(t, m.a)
    const b = entrant(t, m.b!)
    return {
      cards,
      decks: [a.deck, b.deck],
      names: [a.name, b.name],
      levels: [a.bot as BotLevel, b.bot as BotLevel],
      bestOf: m.bestOf,
      opening: t.spec.opening,
      // Enough seeds for the longest series plus replays of games nobody won.
      seeds: Array.from({ length: m.bestOf + 3 }, (_, n) => gameSeed(t, m.id, n)),
    }
  })
  const results = await runJobs<GameRecord[]>(seriesWorker, jobs, 'games', (done) =>
    onProgress?.(done / jobs.length),
  )
  let next = t
  open.forEach((m, i) => {
    for (const g of results[i]) next = recordGame(next, m.id, g)
  })
  return next
}

/** The game to play next in a match, as the table starts it. */
export function nextGame(
  t: Tournament,
  m: Match,
  cards: AsCard[],
  start: Partial<NewGame>,
): NewGame {
  const a = entrant(t, m.a)
  const b = entrant(t, m.b!)
  return {
    cards,
    decks: [a.deck, b.deck],
    names: [a.name, b.name],
    seed: gameSeed(t, m.id, m.games.length),
    ...start,
  }
}

/** Who had the initiative in round 1 of a played game (after rock-paper-scissors). */
export function firstInitiative(game: NewGame, moves: Move[]) {
  let s = createGame(game)
  for (const m of moves) {
    if (s.step.k !== 'rps' && s.step.k !== 'initiative') break
    s = apply(s, m)
  }
  return s.initiative
}
