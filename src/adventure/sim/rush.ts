import type { BotLevel } from '../bot'
import type { AsCard } from '../cards'
import type { Seat } from '../state'
import { playMatch, type Match } from './sim'

/**
 * Rush: one deck against another, many games, seats swapped every other game
 * (each deck keeps its own bot level). Game `g` is the same game wherever it
 * is played, so a batch can be split across workers.
 */
export interface RushJob {
  cards: AsCard[]
  decks: [string[], string[]]
  names: [string, string]
  /** The bot level of each deck. */
  levels: [BotLevel, BotLevel]
  seed: number
}

export interface RushResult {
  game: number
  seed: number
  /** The deck each seat played. */
  seats: [0 | 1, 0 | 1]
  levels: [BotLevel, BotLevel]
  match: Match
  /** Per deck and card: [Fighting Spirit reveals, abilities used] (`deck:cardId`). */
  uses: Record<string, [number, number]>
}

export function rushGame(job: RushJob, g: number): RushResult {
  const seats: [0 | 1, 0 | 1] = g % 2 === 1 ? [1, 0] : [0, 1]
  const seed = (job.seed * 1_000_003 + g * 7919) >>> 0
  const levels: [BotLevel, BotLevel] = [job.levels[seats[0]], job.levels[seats[1]]]
  const match = playMatch(
    {
      cards: job.cards,
      decks: [job.decks[seats[0]], job.decks[seats[1]]],
      names: [job.names[seats[0]], job.names[seats[1]]],
      seed,
    },
    levels,
  )
  const uses: Record<string, [number, number]> = {}
  const count = (seat: Seat, card: string, k: 0 | 1) =>
    (uses[`${seats[seat]}:${card}`] ??= [0, 0])[k]++
  match.moves.forEach((m, i) => {
    if (m.t === 'fs') count(match.by[i], m.card, 0)
    if (m.t === 'ability') count(match.by[i], m.card, 1)
  })
  // Flip and Battle Abilities happen by themselves: count them from the log.
  for (const l of match.state.log) {
    const name = /^(?:Flip|Battle) Ability: (.+?): /.exec(l.text)?.[1]
    if (!name) continue
    for (const seat of [0, 1] as const) {
      const card = job.decks[seats[seat]].find(
        (id) => job.cards.find((c) => c.id === id)?.name === name,
      )
      if (card) count(seat, card, 1)
    }
  }
  return { game: g, seed, seats, levels, match, uses }
}
