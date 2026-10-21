import { actor, apply, legalMoves, type Move } from '../engine'
import type { AsState, Seat } from '../state'
import { determinize } from './determinize'
import { easyMove, normalMove, roll, type Rng } from './policies'

export type BotLevel = 'easy' | 'normal' | 'hard'
export const BOT_LEVELS: BotLevel[] = ['easy', 'normal', 'hard']
export const BOT_NAMES: Record<BotLevel, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }

export interface BotOptions {
  /** Hard: playouts per decision (its strength). */
  playouts?: number
}

const policy = (level: BotLevel) => (level === 'easy' ? easyMove : normalMove)

/**
 * Hard: determinized Monte Carlo. For each candidate move it guesses the
 * hidden cards many times, plays the rest of the round with Normal play on
 * both sides, and keeps the move whose rounds go best.
 */
function hardMove(s: AsState, seat: Seat, r: Rng, playouts: number): Move {
  const legal = legalMoves(s).filter((m) => m.t !== 'unplace')
  // Setup, placing and revealing go by the rules of thumb; Hard thinks about the rest.
  if (legal.length === 1 || s.step.k === 'place' || s.step.k === 'reveal') return normalMove(s, r)
  const candidates = legal.length > 8 ? pickSome(legal, 8, r) : legal
  const per = Math.max(2, Math.floor(playouts / candidates.length))
  let best = candidates[0]
  let bestScore = -Infinity
  for (const m of candidates) {
    let total = 0
    for (let i = 0; i < per; i++) {
      const guess = determinize(s, seat, roll(r, 2 ** 31))
      const next = apply(guess, m)
      total += next === guess ? -100 : rollout(next, seat, r)
    }
    const score = total / per
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
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

/** Play Normal moves to the end of the round: the points gained, plus a big bonus for a win. */
function rollout(s: AsState, seat: Seat, r: Rng): number {
  const before = s.players[seat].points - s.players[seat === 0 ? 1 : 0].points
  const round = s.round
  let x = s
  for (let n = 0; n < 300 && x.step.k !== 'over' && x.round === round; n++) {
    const next = apply(x, normalMove(x, r))
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
  if (level === 'hard') return hardMove(s, seat, r, opts.playouts ?? 96)
  return policy(level)(s, r)
}
