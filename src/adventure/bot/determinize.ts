import { produce } from 'immer'
import { shuffle } from '@/playtest/rng'
import { other, type AsState, type Seat } from '../state'

/**
 * One guess at what `seat` can't see: the opponent's hidden cards (Support
 * and face-down field cards) are shuffled among those places, and coins get a
 * new seed. The bot knows which cards the opponent's Free Company holds
 * (decklists are open), not where they are.
 */
export function determinize(s: AsState, seat: Seat, seed: number): AsState {
  return produce(s, (d) => {
    const p = d.players[other(seat)]
    const down = p.field.flatMap((f, i) => (f.card && !f.faceUp ? [i] : []))
    // Sorted first, so the guess never depends on where the cards really are.
    const hidden = [...p.support, ...down.map((i) => p.field[i].card!)].sort()
    const [mixed, next] = shuffle(hidden, seed)
    p.support = mixed.slice(0, p.support.length)
    down.forEach((i, k) => (p.field[i].card = mixed[p.support.length + k]))
    d.seed = next
  })
}
