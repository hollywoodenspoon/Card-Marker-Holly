import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { apply, createGame, legalMoves } from '@/adventure/engine'
import { basicCards, basicDecks } from '@/adventure/fixtures/basic'
import { other, type AsState } from '@/adventure/state'
import { pieceId, toTable } from '@/adventure/table'
import { observe } from '@/playtest/actions'
import { adventureScuffle, zoneKey } from '@/playtest/setup'
import { hints, movesFor, optionPiece, tapPiece } from './rulesPlay'

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

  it('reveals a later pair that does not touch, and a triple, by tapping each card', () => {
    const start = (reveal: 'pairs' | 'triples') =>
      placed(
        createGame({
          cards: basicCards(),
          decks: basicDecks(),
          names: ['A', 'B'],
          seed: 3,
          reveal,
        }),
      )
    let s = start('pairs')
    const opp = other(s.initiative)
    const at = (slot: number) => pieceId(opp, s.players[opp].field[slot].card!)
    s = apply(apply(s, { t: 'reveal', slots: [0, 1] }), { t: 'reveal', slots: [0, 1] })
    // 2 and 3 are each next to a revealed card, but not to each other.
    expect(tapPiece(s, [2], at(3))).toEqual({
      kind: 'moves',
      moves: [{ t: 'reveal', slots: [2, 3] }],
    })
    // 5 touches nothing revealed yet.
    expect(tapPiece(s, [2], at(5))).toBeNull()
    expect(tapPiece(s, [2, 3], at(3))).toEqual({ kind: 'pick', picks: [2] })

    s = start('triples')
    expect(tapPiece(s, [], at(0))).toEqual({ kind: 'pick', picks: [0] })
    expect(tapPiece(s, [0], at(1))).toEqual({ kind: 'pick', picks: [0, 1] })
    expect(tapPiece(s, [0, 1], at(4))).toEqual({
      kind: 'moves',
      moves: [{ t: 'reveal', slots: [0, 1, 4] }],
    })
  })

  it('marks a tapped choice card instead of choosing it, so looking never chooses', () => {
    const s0 = placed(game())
    const card = s0.players[1].field[0].card!
    const s = produce(s0, (d) => {
      d.step = {
        k: 'choose',
        seat: 0,
        prompt: 'Choose a card.',
        options: [{ id: 'slot:1:0', label: 'A card', seat: 1, slot: 0 }],
      }
    })
    expect(tapPiece(s, [], pieceId(1, card))).toEqual({ kind: 'choice', id: 'slot:1:0' })
    expect(optionPiece(s, 'slot:1:0')).toBe(pieceId(1, card))
    expect(tapPiece(s, [], pieceId(0, s.players[0].field[0].card!))).toBeNull()
  })

  it('holds the rest zone in the Support row during Regroup, the Support set aside', () => {
    // A Regroup refill: some field positions empty, cards waiting in the rest zone.
    const s0 = placed(game())
    const seat = s0.initiative
    const s = produce(s0, (d) => {
      const p = d.players[seat]
      d.phase = 'regroup'
      p.rest = [p.field[2].card!, p.field[5].card!]
      p.field[2] = { card: null, faceUp: false, state: 'ready' }
      p.field[5] = { card: null, faceUp: false, state: 'ready' }
      d.step = { k: 'place', seat, from: 'rest', placed: [] }
    })
    const t = toTable(setup, s)
    const p = s.players[seat]
    expect(t.zones[zoneKey('support', seat)].items).toEqual(p.rest.map((c) => pieceId(seat, c)))
    expect(t.zones[zoneKey('rest', seat)].items).toEqual([])
    // The Support is set aside: its pieces exist but are in no zone.
    const inZones = Object.values(t.zones).flatMap((z) => [
      ...(z.items ?? []),
      ...(z.slots ?? []).flat(),
    ])
    for (const c of p.support) {
      expect(t.pieces[pieceId(seat, c)]).toBeDefined()
      expect(inZones).not.toContain(pieceId(seat, c))
    }
    // Dragging from the hand row places; dragging back onto it takes the card back.
    const piece = pieceId(seat, p.rest[0])
    expect(
      movesFor(s, { t: 'move', piece, to: { zone: zoneKey('field', seat), slot: 2 } }),
    ).toEqual([{ t: 'place', card: p.rest[0], slot: 2 }])
    const after = apply(s, { t: 'place', card: p.rest[0], slot: 2 })
    expect(movesFor(after, { t: 'move', piece, to: { zone: zoneKey('support', seat) } })).toEqual([
      { t: 'unplace', slot: 2 },
    ])
    // Outside Regroup the table is drawn as usual.
    expect(toTable(setup, s0).zones[zoneKey('support', seat)].items).toEqual(
      s0.players[seat].support.map((c) => pieceId(seat, c)),
    )
  })
})
