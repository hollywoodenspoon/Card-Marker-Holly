import type { BotLevel } from '../bot'
import type { AsCard } from '../cards'
import { playMatch } from '../sim/sim'
import type { Seat } from '../state'
import { seriesStart, type GameRecord } from './tournament'

export interface SeriesJob {
  cards: AsCard[]
  decks: [string[], string[]]
  names: [string, string]
  levels: [BotLevel, BotLevel]
  bestOf: number
  opening: 'rps' | 'coin'
  /** One seed per game. */
  seeds: number[]
}

/**
 * A bot-against-bot match, game after game until one side has won the
 * majority: game 1 by the opening, then the initiative goes to whoever went
 * second the game before. A game nobody wins (the move limit) is replayed with
 * the next seed.
 */
export function playSeries(j: SeriesJob): GameRecord[] {
  const games: GameRecord[] = []
  const need = Math.ceil(j.bestOf / 2)
  const won = (seat: Seat) => games.filter((g) => g.winner === seat).length
  for (let n = 0; n < j.seeds.length && won(0) < need && won(1) < need; n++) {
    const start = seriesStart(games, j.opening)
    const m = playMatch(
      { cards: j.cards, decks: j.decks, names: j.names, seed: j.seeds[n], ...start },
      j.levels,
    )
    games.push({
      seed: j.seeds[n],
      first: m.first,
      ...start,
      winner: m.state.winner?.seat ?? null,
      moves: m.moves,
      points: [m.state.players[0].points, m.state.players[1].points],
      rounds: m.state.round,
    })
  }
  return games
}
