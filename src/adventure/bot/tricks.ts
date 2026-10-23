import { apply, legalMoves, type Move } from '../engine'
import type { AsState, Seat } from '../state'
import { determinize } from './determinize'
import { evaluate } from './evaluate'
import { chooseMove, roll, type Rng } from './policies'

export { evaluate, projectAssignment } from './evaluate'

/**
 * Skirmish Tricks and Combat Tricks for the Normal and Hard bots: they look
 * one decision ahead. Each option is tried on a few guesses of the hidden
 * cards, and the board after it is scored by the coming combat: who will
 * attack whom (Fate Numbers decide it), the Attack and Defense on each side,
 * and the Fighting Spirit each player has left.
 */

/** Guesses of the hidden cards per decision (the same guesses for every option). */
const GUESSES = 3
/** Points of edge an ability must win to be used before the last response. */
const WAIT = 0.12

/**
 * Finish the decisions an option leads to: the next own choice by trying each
 * option, later ones and the opponent's by rule of thumb.
 */
function settle(s: AsState, seat: Seat, r: Rng, depth = 0): AsState {
  let x = s
  for (let n = 0; n < 8 && x.step.k === 'choose'; n++) {
    const st = x.step
    let m: Move
    if (st.seat === seat && depth < 1) {
      let best = -Infinity
      m = { t: 'choose', id: st.options[0].id }
      for (const o of st.options) {
        const mv: Move = { t: 'choose', id: o.id }
        const v = evaluate(settle(apply(x, mv), seat, r, depth + 1), seat)
        if (v > best) {
          best = v
          m = mv
        }
      }
    } else m = chooseMove(x, st.seat, r)
    const next = apply(x, m)
    if (next === x) break
    x = next
  }
  return x
}

/** The best response or choice for the player to act, by looking one decision ahead. */
export function trickMove(s: AsState, seat: Seat, r: Rng): Move {
  const legal = legalMoves(s)
  if (legal.length === 1) return legal[0]
  const guesses = Array.from({ length: GUESSES }, () => determinize(s, seat, roll(r, 2 ** 31)))
  const score = (m: Move) => {
    let total = 0
    for (const g of guesses) {
      const next = apply(g, m)
      total += next === g ? -50 : evaluate(settle(next, seat, r), seat)
    }
    return total / guesses.length
  }
  const scored = legal.map((m) => ({ m, v: score(m) }))
  scored.sort((a, b) => b.v - a.v)
  const st = s.step
  // Timing: before the last response, keep an ability for later unless it clearly pays now.
  if (st.k === 'respond' && !st.final) {
    const pass = scored.find((x) => x.m.t === 'pass')
    if (pass && scored[0].m.t !== 'pass' && scored[0].v - pass.v < WAIT) return pass.m
  }
  return scored[0].m
}
