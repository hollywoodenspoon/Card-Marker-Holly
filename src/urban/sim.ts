import { botMove, type UwLevel } from './bot'
import { deal, type UwPackCard } from './cards'
import { apply, createGame } from './engine'
import type { Seat, UwState } from './state'

/** Moves after which a bot game is stopped and counted as a draw. */
export const MOVE_CAP = 400

export interface SimTally {
  games: number
  /** Wins of seat 0 and seat 1. */
  wins: [number, number]
  draws: number
  /** Games won by whoever went first. */
  firstWins: number
  /** Wins by how they were won; "cap" is a game stopped at MOVE_CAP. */
  by: { battleline: number; objective: number; attrition: number; cap: number }
  turns: number
}

export const emptyTally = (): SimTally => ({
  games: 0,
  wins: [0, 0],
  draws: 0,
  firstWins: 0,
  by: { battleline: 0, objective: 0, attrition: 0, cap: 0 },
  turns: 0,
})

/** Seeded random numbers (mulberry32), so a run can be repeated. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One bot vs bot game; who goes first alternates with the game number. */
export function playOne(
  cards: UwPackCard[],
  levels: [UwLevel, UwLevel],
  game: number,
  rand: () => number,
): { end: UwState; capped: boolean } {
  let s = createGame(deal(cards), (game % 2) as Seat)
  let i = 0
  for (; i < MOVE_CAP && s.winner === null; i++) s = apply(s, botMove(s, levels[s.turn], rand))
  return { end: s, capped: s.winner === null }
}

/** Add one game to the tally (mutates it). */
export function count(t: SimTally, end: UwState, capped: boolean) {
  t.games++
  t.turns += end.turnsTaken[0] + end.turnsTaken[1]
  if (capped || end.winner === 'draw' || end.winner === null) {
    t.draws++
    if (capped) t.by.cap++
    return
  }
  t.wins[end.winner]++
  if (end.winner === end.first) t.firstWins++
  if (end.reason) t.by[end.reason]++
}

/** Play `n` games in one go (tests; the table runs them in chunks). */
export function simulate(
  cards: UwPackCard[],
  levels: [UwLevel, UwLevel],
  n: number,
  seed = 1,
): SimTally {
  const t = emptyTally()
  const rand = rng(seed)
  for (let g = 0; g < n; g++) {
    const { end, capped } = playOne(cards, levels, g, rand)
    count(t, end, capped)
  }
  return t
}
