import { actor, type Move } from '@/adventure/engine'
import { other, type AsState, type Seat } from '@/adventure/state'
import { pieceId } from '@/adventure/table'
import { optionPiece } from './rulesPlay'

/**
 * What a player is about to do, shown for a beat before it happens: the cards
 * the move picks (they lift and glow, with a pointer on them) and, for placing,
 * the position the card goes to. Pure, so it can be tested.
 */
export interface Intent {
  seat: Seat
  /** In words, after the player's name: "selects 2 cards to reveal". */
  what: string
  pieces: string[]
  /** A field position the move puts a card on. */
  slot?: { seat: Seat; slot: number }
}

export function intentOf(s: AsState, m: Move): Intent | null {
  const seat = actor(s)
  if (seat === null) return null
  const field = (x: Seat, slots: number[]) =>
    slots.flatMap((i) => {
      const card = s.players[x].field[i]?.card
      return card ? [pieceId(x, card)] : []
    })
  switch (m.t) {
    case 'reveal': {
      const pieces = field(other(seat), m.slots)
      const n = pieces.length
      return { seat, what: `selects ${n === 1 ? 'a card' : `${n} cards`} to reveal`, pieces }
    }
    case 'fs':
      return {
        seat,
        what:
          m.from === 'rest'
            ? 'uses a rest-zone card for Fighting Spirit'
            : 'reveals Fighting Spirit',
        pieces: [pieceId(seat, m.card)],
      }
    case 'ability':
      return { seat, what: 'activates an ability', pieces: [pieceId(seat, m.card)] }
    case 'choose': {
      const piece = optionPiece(s, m.id)
      return piece ? { seat, what: 'chooses', pieces: [piece] } : null
    }
    case 'place':
      return {
        seat,
        what: 'places a card',
        pieces: [pieceId(seat, m.card)],
        slot: { seat, slot: m.slot },
      }
    default:
      return null
  }
}
