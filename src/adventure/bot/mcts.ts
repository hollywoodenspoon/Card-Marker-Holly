import { legalMoves, moveKey, playInPlace, searchCopy, type Move } from '../engine'
import type { AsState, Seat } from '../state'
import { determinize } from './determinize'
import { evaluate } from './evaluate'
import { quickMove, roll, type Rng } from './policies'

/**
 * The Hard bot: Monte Carlo tree search over hidden information
 * (single-observer ISMCTS). Each iteration guesses the opponent's hidden cards
 * (`determinize`), walks one shared tree of moves for both players, plays a
 * short light-quick playout, and scores the end with `evaluate`. The move
 * played most often from the root is chosen. It only sees what its seat may
 * know: hidden cards come from the guess, never from the real state.
 */

export interface MctsOptions {
  /** Iterations (practice games); a ceiling when `thinkMs` is set. */
  iterations?: number
  /** Stop after about this many milliseconds (play on the table). */
  thinkMs?: number
}

/** Iterations when no budget is given. */
export const MCTS_ITERATIONS = 400
/** Exploration constant of UCB1. */
const C = 0.7
/** Playout length: moves after leaving the tree (or the end of the round). */
const PLAYOUT = 24
/** Moves played inside the tree per iteration, at most. */
const TREE_DEPTH = 40
/** Evaluation points to win probability. */
const SCALE = 0.9

interface Node {
  visits: number
  /** Times the node's move was legal when its parent was reached. */
  avail: number
  /** Sum of results, from the searching seat's side (0 to 1). */
  value: number
  seat: Seat | null
  move: Move | null
  children: Map<string, Node>
}

const node = (move: Move | null, seat: Seat | null): Node => ({
  visits: 0,
  avail: 0,
  value: 0,
  seat,
  move,
  children: new Map(),
})

/** The moves the search considers: never taking back a placed card. */
const options = (s: AsState) => legalMoves(s).filter((m) => m.t !== 'unplace')

const sigma = (z: number) => 1 / (1 + Math.exp(-z))

/** The end of a playout, from `seat`'s side: 1 a win, 0 a loss, between from the board. */
function score(s: AsState, seat: Seat): number {
  if (s.winner) return s.winner.seat === seat ? 1 : 0
  return sigma(SCALE * evaluate(s, seat))
}

/** How many children a node may have opened after `visits` (progressive widening). */
const widen = (visits: number) => 2 + Math.floor(Math.sqrt(visits))

export function mctsMove(s: AsState, seat: Seat, r: Rng, opts: MctsOptions = {}): Move {
  const root = options(s)
  if (root.length === 1) return root[0]
  if (s.step.k === 'rps') return root[roll(r, root.length)]
  const iterations = opts.iterations ?? MCTS_ITERATIONS
  const deadline = opts.thinkMs ? Date.now() + opts.thinkMs : Infinity
  const tree = node(null, null)
  for (let i = 0; i < iterations; i++) {
    if (i > 0 && i % 16 === 0 && Date.now() > deadline) break
    const world = searchCopy(determinize(s, seat, roll(r, 2 ** 31)))
    const path: Node[] = [tree]
    let at = tree
    let expanded = false
    // Selection and expansion.
    for (let depth = 0; depth < TREE_DEPTH && world.step.k !== 'over'; depth++) {
      const legal = options(world)
      if (legal.length === 1) {
        playInPlace(world, legal[0])
        continue
      }
      const actor = world.step.seat
      const keyed = legal.map((m) => [moveKey(m), m] as const)
      for (const [k] of keyed) {
        const c = at.children.get(k)
        if (c) c.avail++
      }
      const untried = keyed.filter(([k]) => !at.children.has(k))
      if (untried.length && at.children.size < widen(at.visits)) {
        const [k, m] = untried[roll(r, untried.length)]
        const child = node(m, actor)
        child.avail = 1
        at.children.set(k, child)
        playInPlace(world, m)
        path.push(child)
        expanded = true
        break
      }
      // UCB1 over the children legal in this guess, from the actor's side.
      let best: Node | null = null
      let bestU = -Infinity
      for (const [k] of keyed) {
        const c = at.children.get(k)
        if (!c || !c.visits) continue
        const mean = c.value / c.visits
        const q = actor === seat ? mean : 1 - mean
        const u = q + C * Math.sqrt(Math.log(c.avail) / c.visits)
        if (u > bestU) {
          bestU = u
          best = c
        }
      }
      if (!best) break
      playInPlace(world, best.move!)
      path.push(best)
      at = best
    }
    // Playout: light quick play to the end of the round, or PLAYOUT moves.
    if (expanded || world.step.k !== 'over') {
      const round = world.round
      for (let n = 0; n < PLAYOUT && world.step.k !== 'over' && world.round === round; n++)
        playInPlace(world, quickMove(world, r, true))
    }
    const v = score(world, seat)
    for (const n of path) {
      n.visits++
      n.value += v
    }
  }
  // The root move played most often (ties: the better mean).
  let pick = root[0]
  let most = -1
  let mean = -1
  for (const m of root) {
    const c = tree.children.get(moveKey(m))
    if (!c) continue
    const avg = c.visits ? c.value / c.visits : 0
    if (c.visits > most || (c.visits === most && avg > mean)) {
      most = c.visits
      mean = avg
      pick = m
    }
  }
  return pick
}
