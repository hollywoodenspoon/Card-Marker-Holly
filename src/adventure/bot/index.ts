import { actor, apply, applyFast, legalMoves, type Move } from '../engine'
import type { AsState, Seat } from '../state'
import { determinize } from './determinize'
import { mctsMove } from './mcts'
import { quickMove, roll, type Rng } from './policies'
import { trickMove } from './tricks'

export type BotLevel = 'easy' | 'normal' | 'hard'
export const BOT_LEVELS: BotLevel[] = ['easy', 'normal', 'hard']
export const BOT_NAMES: Record<BotLevel, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }

export interface BotOptions {
  /** Normal: playouts per decision (its strength). */
  playouts?: number
  /** Hard: iterations per decision (a ceiling when `thinkMs` is set). */
  iterations?: number
  /** Normal and Hard: think for about this many milliseconds at most. */
  thinkMs?: number
}

/**
 * The levels, by what they are (the stored names stay easy, normal and hard):
 * Easy is "Tricks" (rules of thumb, plus a one-decision look ahead for
 * abilities and choices), Normal is "Search" (Tricks, plus playouts for
 * Fighting Spirit and the First Engagement), Hard is MCTS over every decision.
 * Until v0.2.0 these were Normal, Hard and a random Easy.
 */

/** Easy ("Tricks"): rules of thumb, plus Skirmish and Combat Tricks for abilities and choices. */
export function tricksMove(s: AsState, r: Rng): Move {
  const st = s.step
  if (st.k === 'respond' || st.k === 'choose') return trickMove(s, st.seat, r)
  return quickMove(s, r)
}

/**
 * Normal ("Search"): determinized Monte Carlo. For each candidate move it guesses the
 * hidden cards many times, plays the rest of the round with quick play on
 * both sides, and keeps the move whose rounds go best. Abilities and choices
 * go by Easy's Tricks.
 */
function searchMove(s: AsState, seat: Seat, r: Rng, playouts: number, thinkMs?: number): Move {
  const legal = legalMoves(s).filter((m) => m.t !== 'unplace')
  // Placing and revealing go by the rules of thumb, abilities and choices by the Tricks;
  // Search plays out Fighting Spirit and the First Engagement.
  if (legal.length === 1 || !['fs', 'first'].includes(s.step.k)) return tricksMove(s, r)
  const candidates = legal.length > 8 ? pickSome(legal, 8, r) : legal
  const per = Math.max(2, Math.floor(playouts / candidates.length))
  const deadline = thinkMs ? Date.now() + thinkMs : Infinity
  // One playout per candidate in turn, so a time limit cuts every candidate alike.
  const total = candidates.map(() => 0)
  let done = 0
  for (let i = 0; i < per; i++) {
    if (i > 0 && Date.now() > deadline) break
    candidates.forEach((m, k) => {
      const guess = determinize(s, seat, roll(r, 2 ** 31))
      const next = apply(guess, m)
      total[k] += next === guess ? -100 : rollout(next, seat, r)
    })
    done++
  }
  let best = candidates[0]
  let bestScore = -Infinity
  candidates.forEach((m, k) => {
    const score = total[k] / Math.max(1, done)
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  })
  return best
}

function pickSome(moves: Move[], n: number, r: Rng): Move[] {
  const pool = [...moves]
  const out: Move[] = []
  // Always keep passing in view.
  const pass = pool.findIndex((m) => m.t === 'pass')
  if (pass >= 0) out.push(...pool.splice(pass, 1))
  while (out.length < n && pool.length) out.push(...pool.splice(roll(r, pool.length), 1))
  return out
}

/** Play quick moves to the end of the round: the points gained, plus a big bonus for a win. */
function rollout(s: AsState, seat: Seat, r: Rng): number {
  const before = s.players[seat].points - s.players[seat === 0 ? 1 : 0].points
  const round = s.round
  let x = s
  // Quick moves are legal by construction, so the playout skips the legality check and log.
  for (let n = 0; n < 300 && x.step.k !== 'over' && x.round === round; n++) {
    const next = applyFast(x, quickMove(x, r))
    if (next === x) break
    x = next
  }
  if (x.winner) return x.winner.seat === seat ? 100 : -100
  const after = x.players[seat].points - x.players[seat === 0 ? 1 : 0].points
  // Keeping Fighting Spirit for later rounds is worth a little.
  const support = x.players[seat].support.length - x.players[seat === 0 ? 1 : 0].support.length
  return (after - before) * 10 + support * 0.2
}

/** The bot's move for the player to act. */
export function botMove(s: AsState, level: BotLevel, seed: number, opts: BotOptions = {}): Move {
  const seat = actor(s)
  if (seat === null) throw new Error('The game is over.')
  const r = { seed }
  if (level === 'hard') return mctsMove(s, seat, r, opts)
  if (level === 'normal') return searchMove(s, seat, r, opts.playouts ?? 96, opts.thinkMs)
  return tricksMove(s, r)
}
