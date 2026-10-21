import { describe, expect, it } from 'vitest'
import { apply, createGame, legalMoves } from '@/adventure/engine'
import { basicCards, basicDecks } from '@/adventure/fixtures/basic'
import { other, type AsState } from '@/adventure/state'
import { pieceId, toTable } from '@/adventure/table'
import { observe } from '@/playtest/actions'
import { adventureScuffle, zoneKey } from '@/playtest/setup'
import { hints, movesFor, tapPiece } from './rulesPlay'

const setup = adventureScuffle({ w: 63, h: 88 })
const game = () =>
  createGame({ cards: basicCards(), decks: basicDecks(), names: ['Ann', 'Bo'], seed: 3 })

function placed(s: AsState): AsState {
  while (s.step.k === 'place')
    s = apply(s, legalMoves(s).find((m) => m.t === 'placeRandom') ?? { t: 'done' })
  return s
}

describe('rules on the table', () => {
  it('draws the rules state on the Adventure Scuffle table', () => {
    const s = placed(game())
    const t = toTable(setup, s)
    expect(Object.keys(t.pieces)).toHaveLength(24)
    expect(t.zones[zoneKey('field', 0)].slots!.every((x) => x.length === 1)).toBe(true)
    expect(t.zones[zoneKey('support', 1)].items).toHaveLength(6)
    expect(t.counters[zoneKey('points', 0)]).toBe(0)
    // Face-down field cards are hidden from the opponent, known to their owner.
    const card = s.players[1].field[0].card!
    expect(observe(setup, t, 0).pieces[pieceId(1, card)].cardId).toBe('')
    expect(observe(setup, t, 1).pieces[pieceId(1, card)].cardId).toBe(card)
  })

  it('turns a drag from Support to an empty position into placing, and back', () => {
    const s = game()
    const seat = s.initiative
    const card = s.players[seat].support[0]
    const piece = pieceId(seat, card)
    const toField = { t: 'move' as const, piece, to: { zone: zoneKey('field', seat), slot: 4 } }
    expect(movesFor(s, toField)).toEqual([{ t: 'place', card, slot: 4 }])
    // Not onto the opponent's field.
    expect(
      movesFor(s, { ...toField, to: { zone: zoneKey('field', other(seat)), slot: 4 } }),
    ).toBeNull()
    const t = apply(s, { t: 'place', card, slot: 4 })
    expect(movesFor(t, { t: 'move', piece, to: { zone: zoneKey('support', seat) } })).toEqual([
      { t: 'unplace', slot: 4 },
    ])
    expect(
      movesFor(t, { t: 'move', piece, to: { zone: zoneKey('field', seat), slot: 0 } }),
    ).toEqual([
      { t: 'unplace', slot: 4 },
      { t: 'place', card, slot: 0 },
    ])
    expect(hints(t, []).slots.has(`${zoneKey('field', seat)}:4`)).toBe(false)
    expect(hints(t, []).slots.size).toBe(5)
  })

  it('reveals a pair with two taps on adjacent cards', () => {
    const s = placed(game())
    const opp = other(s.initiative)
    const at = (slot: number) => pieceId(opp, s.players[opp].field[slot].card!)
    // Own cards can't be revealed.
    expect(
      tapPiece(s, [], pieceId(s.initiative, s.players[s.initiative].field[0].card!)),
    ).toBeNull()
    expect(tapPiece(s, [], at(0))).toEqual({ kind: 'pick', picks: [0] })
    // Highlights: only the first pick's neighbours.
    expect([...hints(s, [0]).pieces].sort()).toEqual([at(1), at(3)].sort())
    // Not adjacent: start over from the new card.
    expect(tapPiece(s, [0], at(5))).toEqual({ kind: 'pick', picks: [5] })
    expect(tapPiece(s, [0], at(1))).toEqual({
      kind: 'moves',
      moves: [{ t: 'reveal', slots: [0, 1] }],
    })
    expect(tapPiece(s, [0], at(0))).toEqual({ kind: 'pick', picks: [] })
  })
})
