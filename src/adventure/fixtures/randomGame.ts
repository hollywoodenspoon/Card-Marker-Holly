import { nextInt } from '@/playtest/rng'
import { apply, createGame, legalMoves } from '../engine'
import type { AsState, RevealRule } from '../state'
import { FIRST_QUEST } from './firstQuest'

/** Every card of a player is in exactly one place. */
function cardsOf(s: AsState, seat: 0 | 1) {
  const p = s.players[seat]
  return [...p.field.flatMap((f) => (f.card ? [f.card] : [])), ...p.support, ...p.rest, ...p.spent]
}

/** Random legal moves from a seed until the game ends. */
export function randomGame(a: string[], b: string[], seed: number, reveal?: RevealRule) {
  let s = createGame({ cards: FIRST_QUEST, decks: [a, b], names: ['A', 'B'], seed, reveal })
  let r = seed ^ 0x5bd1e995
  let moves = 0
  for (; moves < 3000 && s.step.k !== 'over'; moves++) {
    // Taking back a placed card only makes the game longer.
    const all = legalMoves(s)
    const legal = all.filter((m) => m.t !== 'unplace')
    let i: number
    ;[i, r] = nextInt(r, legal.length)
    const next = apply(s, legal[i])
    if (next === s) throw new Error(`legal move refused: ${JSON.stringify(legal[i])}`)
    s = next
    for (const seat of [0, 1] as const) {
      const all = cardsOf(s, seat)
      if (all.length !== 12 || new Set(all).size !== 12)
        throw new Error(`seat ${seat} cards: ${all.join(',')} after ${JSON.stringify(legal[i])}`)
    }
  }
  return { s, moves }
}
