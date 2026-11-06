import { apply, hasBattleline, legalMoves, scores } from './engine'
import { CENTER, other, type Seat, type UwMove, type UwState } from './state'

/**
 * Urban Warfare bots. Card counting is allowed, so both hands are known and the
 * Normal bot can search the game as fully known.
 */

export type UwLevel = 'easy' | 'normal'

export function easyMove(s: UwState, rand = Math.random): UwMove {
  const moves = legalMoves(s)
  return moves[Math.floor(rand() * moves.length)]
}

const WIN = 10000

/** How good the state is for `seat`. */
export function evaluate(s: UwState, seat: Seat): number {
  if (s.winner === 'draw') return 0
  if (s.winner !== null) return s.winner === seat ? WIN : -WIN
  const [a, b] = scores(s.field)
  let v = seat === 0 ? a - b : b - a
  const h = s.centerHold
  if (h) v += (h.seat === seat ? 1 : -1) * (4 + 4 * h.oppTurns)
  const c = s.field[CENTER]
  if (c) v += c.owner === seat ? 2 : -2
  v += flagThreat(s, seat) - flagThreat(s, other(seat))
  return v
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
]

/** Lines with 2 of a seat's Battleline Mechs and nothing of the other's. */
function flagThreat(s: UwState, seat: Seat): number {
  if (hasBattleline(s.field, seat)) return 30
  let t = 0
  for (const l of LINES) {
    let mine = 0
    let blocked = false
    for (const z of l) {
      const p = s.field[z]
      if (p?.owner === seat && p.card.kind === 'flag') mine++
      else if (p) blocked = true
    }
    if (mine === 2 && !blocked) t += 3
  }
  return t
}

function search(s: UwState, seat: Seat, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || s.winner !== null) return evaluate(s, seat)
  const maxing = s.turn === seat
  let best = maxing ? -Infinity : Infinity
  for (const m of legalMoves(s)) {
    // A second placement in the same turn doesn't use up depth.
    const n = apply(s, m)
    const d = n.turn === s.turn && n.winner === null ? depth : depth - 1
    const v = search(n, seat, d, alpha, beta)
    if (maxing) {
      best = Math.max(best, v)
      alpha = Math.max(alpha, v)
    } else {
      best = Math.min(best, v)
      beta = Math.min(beta, v)
    }
    if (beta <= alpha) break
  }
  return best
}

export function normalMove(s: UwState, depth = 2, rand = Math.random): UwMove {
  const seat = s.turn
  let best: UwMove[] = []
  let bestV = -Infinity
  for (const m of legalMoves(s)) {
    const n = apply(s, m)
    const d = n.turn === seat && n.winner === null ? depth : depth - 1
    const v = search(n, seat, d, bestV - 1, Infinity)
    if (v > bestV) {
      bestV = v
      best = [m]
    } else if (v === bestV) best.push(m)
  }
  return best[Math.floor(rand() * best.length)]
}

export const botMove = (s: UwState, level: UwLevel, rand = Math.random) =>
  level === 'easy' ? easyMove(s, rand) : normalMove(s, 2, rand)
