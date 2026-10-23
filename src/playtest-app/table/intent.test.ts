import { describe, expect, it } from 'vitest'
import { apply, createGame, legalMoves, type Move } from '@/adventure/engine'
import { basicCards, basicDecks } from '@/adventure/fixtures/basic'
import { other, type AsState } from '@/adventure/state'
import { pieceId } from '@/adventure/table'
import { intentOf } from './intent'

const game = () =>
  createGame({ cards: basicCards(), decks: basicDecks(), names: ['Ann', 'Bo'], seed: 3 })

function placed(s: AsState): AsState {
  while (s.step.k === 'place')
    s = apply(s, legalMoves(s).find((m) => m.t === 'placeRandom') ?? { t: 'done' })
  return s
}

describe('intentOf', () => {
  it("names the cards a reveal picks on the opponent's field", () => {
    const s = placed(game())
    const opp = other(s.initiative)
    const m: Move = { t: 'reveal', slots: [0, 1] }
    expect(intentOf(s, m)).toEqual({
      seat: s.initiative,
      what: 'selects 2 cards to reveal',
      pieces: [0, 1].map((i) => pieceId(opp, s.players[opp].field[i].card!)),
    })
  })

  it('names the card being placed and where it goes', () => {
    const s = game()
    const seat = s.initiative
    const card = s.players[seat].support[0]
    expect(intentOf(s, { t: 'place', card, slot: 4 })).toEqual({
      seat,
      what: 'places a card',
      pieces: [pieceId(seat, card)],
      slot: { seat, slot: 4 },
    })
  })

  it('shows nothing for moves without a card', () => {
    expect(intentOf(game(), { t: 'done' })).toBeNull()
  })
})
