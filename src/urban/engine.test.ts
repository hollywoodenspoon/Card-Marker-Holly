import { describe, expect, it } from 'vitest'
import { easyMove, normalMove } from './bot'
import { cardsFromPack, deal, isUrbanPack } from './cards'
import { apply, createGame, isLegal, legalMoves, strength } from './engine'
import type { Kind, Piece, Seat, UwCard, UwState } from './state'
import type { PackCard } from '@/playtest/pack'

const FP: Record<Kind, number> = { flag: 2, nil: 3, support: 1, bomb: 0 }
let n = 0
const card = (kind: Kind): UwCard => ({
  id: `c${n++}`,
  packId: kind,
  name: kind,
  kind,
  fp: FP[kind],
})
const piece = (kind: Kind, owner: Seat): Piece => ({ card: card(kind), owner })

/** A game past the first turns, with the given field and hands. */
function mid(
  field: (Piece | null)[],
  hands: [Kind[], Kind[]] = [['nil'], ['nil']],
  turn: Seat = 0,
): UwState {
  const s = createGame([hands[0].map(card), hands[1].map(card)], 0)
  return { ...s, field, turn, turnsTaken: [3, 3] }
}
const empty = () => Array<Piece | null>(9).fill(null)

describe('placing and pushing', () => {
  it('edge pushes inward; corner offers both directions', () => {
    const f = empty()
    f[1] = piece('support', 1)
    f[0] = piece('support', 1)
    const s = mid(f)
    const places = legalMoves(s).filter((m) => m.type === 'place')
    expect(
      places
        .filter((m) => m.type === 'place' && m.zone === 1)
        .map((m) => m.type === 'place' && m.dir),
    ).toEqual(['down'])
    expect(
      places
        .filter((m) => m.type === 'place' && m.zone === 0)
        .map((m) => m.type === 'place' && m.dir)
        .sort(),
    ).toEqual(['down', 'right'])
    expect(places.some((m) => m.type === 'place' && m.zone === 4)).toBe(false)
  })

  it('placed card uses printed firepower against the enemy strength', () => {
    const f = empty()
    f[1] = piece('flag', 1)
    f[2] = piece('support', 1) // flag now 4
    const s = mid(f, [['nil'], ['nil']])
    expect(strength(f, 1)).toBe(4)
    expect(legalMoves(s).some((m) => m.type === 'place' && m.zone === 1)).toBe(false)
  })

  it('a line is pushed through and the last card falls off', () => {
    const f = empty()
    f[1] = piece('flag', 1) // 2
    f[4] = piece('flag', 1) // 2
    f[7] = piece('support', 0)
    const s0 = mid(f, [['nil'], ['nil']])
    const s = apply(s0, { type: 'place', card: s0.hands[0][0].id, zone: 1, dir: 'down' })
    expect(s.field[1]?.card.kind).toBe('nil')
    expect(s.field[4]?.owner).toBe(1)
    expect(s.field[7]?.owner).toBe(1)
    expect(s.field.filter(Boolean)).toHaveLength(3)
  })

  it('each card in the chain must be able to push the enemy card in front of it', () => {
    const f = empty()
    f[1] = piece('support', 0) // own: pushed freely, then pushes with 1
    f[4] = piece('flag', 1) // 2: too strong for the Logistics Mech
    const s = mid(f, [['nil'], ['nil']])
    expect(legalMoves(s).some((m) => m.type === 'place' && m.zone === 1)).toBe(false)
    f[4] = piece('bomb', 1) // 0: fine
    expect(legalMoves(mid(f)).some((m) => m.type === 'place' && m.zone === 1)).toBe(true)
  })

  it('an enemy card pushes the next enemy card freely', () => {
    const f = empty()
    f[1] = piece('flag', 1) // 2
    f[4] = piece('nil', 1) // 3, same side as the flag
    expect(legalMoves(mid(f)).some((m) => m.type === 'place' && m.zone === 1)).toBe(true)
  })

  it('a weak enemy card cannot push a strong card of yours behind it', () => {
    const f = empty()
    f[1] = piece('support', 1) // 1
    f[4] = piece('nil', 0) // 3
    expect(legalMoves(mid(f)).some((m) => m.type === 'place' && m.zone === 1)).toBe(false)
  })

  it('logistics counts only where the pusher stands before moving', () => {
    const f = empty()
    f[3] = piece('support', 0)
    f[0] = piece('support', 0) // adjacent to 3: it is 3
    f[4] = piece('flag', 1) // 2
    const s = mid(f)
    expect(isLegal(s, { type: 'move', from: 3, dir: 'right' })).toBe(true)
    f[0] = null
    expect(isLegal(mid(f), { type: 'move', from: 3, dir: 'right' })).toBe(false)
  })

  it('own cards move off the field and are gone', () => {
    const f = empty()
    f[0] = piece('nil', 0)
    const s = apply(mid(f), { type: 'move', from: 0, dir: 'up' })
    expect(s.field.every((p) => p === null)).toBe(true)
  })

  it('a Fighter-Bomber from the hand removes any enemy card', () => {
    const f = empty()
    f[8] = piece('nil', 1)
    f[0] = piece('flag', 0)
    const s0 = mid(f, [['bomb', 'nil'], ['nil']])
    const bombs = legalMoves(s0).filter((m) => m.type === 'bomb')
    expect(bombs.map((m) => m.type === 'bomb' && m.target)).toEqual([8])
    expect(legalMoves(s0).some((m) => m.type === 'place' && s0.hands[0][0].id === m.card)).toBe(
      false,
    )
    const s = apply(s0, { type: 'bomb', card: s0.hands[0][0].id, target: 8 })
    expect(s.field[8]).toBeNull()
    expect(s.hands[0].map((c) => c.kind)).toEqual(['nil'])
    expect(s.discard[0].map((c) => c.kind)).toEqual(['bomb'])
    expect(s.turn).toBe(1)
  })

  it('no bombing on the first turn', () => {
    const f = empty()
    f[8] = piece('nil', 1)
    const s = { ...mid(f, [['bomb', 'nil'], ['nil']]), turnsTaken: [0, 1] as [number, number] }
    expect(legalMoves(s).some((m) => m.type === 'bomb')).toBe(false)
  })
})

describe('turns', () => {
  it('no pass on the first turn; the second player places twice', () => {
    let s = createGame(
      deal([
        ...(['flag', 'nil', 'support', 'bomb'] as Kind[]).map((k) => ({
          packId: k,
          name: k,
          kind: k,
          fp: FP[k],
        })),
      ]),
      0,
    )
    expect(legalMoves(s).some((m) => m.type === 'pass')).toBe(false)
    s = apply(s, legalMoves(s)[0])
    expect(s.turn).toBe(1)
    expect(legalMoves(s).some((m) => m.type === 'pass')).toBe(false)
    s = apply(s, legalMoves(s)[0])
    expect(s.turn).toBe(1)
    s = apply(s, legalMoves(s)[0])
    expect(s.turn).toBe(0)
    expect(s.hands[1]).toHaveLength(7)
  })
})

describe('winning', () => {
  it('battleline wins when the opponent ends a turn', () => {
    const f = empty()
    f[0] = piece('flag', 0)
    f[1] = piece('flag', 0)
    f[2] = piece('flag', 0)
    let s = mid(f, [['nil'], ['nil']], 1)
    s = apply(s, { type: 'pass' })
    expect(s.winner).toBe(0)
    expect(s.reason).toBe('battleline')
  })

  it('both lines: the player on turn wins at once', () => {
    const f = empty()
    ;[0, 1, 2].forEach((z) => (f[z] = piece('flag', 0)))
    ;[6, 7, 8].forEach((z) => (f[z] = piece('flag', 1)))
    const s = apply(mid(f, [['nil'], ['nil']], 0), { type: 'pass' })
    expect(s.winner).toBe(0)
  })

  it('objective: hold the center through 3 opponent turns, win at your turn start', () => {
    const f = empty()
    f[3] = piece('nil', 0)
    let s = mid(f, [
      ['nil', 'nil', 'nil'],
      ['nil', 'nil', 'nil'],
    ])
    s = apply(s, { type: 'move', from: 3, dir: 'right' }) // takes center
    expect(s.centerHold).toEqual({ seat: 0, oppTurns: 0 })
    s = apply(s, { type: 'place', card: s.hands[1][0].id, zone: 0 })
    s = apply(s, { type: 'place', card: s.hands[0][0].id, zone: 8 })
    expect(s.winner).toBe(null)
    s = apply(s, { type: 'place', card: s.hands[1][0].id, zone: 2 })
    s = apply(s, { type: 'place', card: s.hands[0][0].id, zone: 6 })
    expect(s.winner).toBe(null)
    s = apply(s, { type: 'place', card: s.hands[1][0].id, zone: 1 })
    expect(s.winner).toBe(0)
    expect(s.reason).toBe('objective')
  })

  it('passing never ends the game while cards are in hand', () => {
    let s = mid(empty())
    for (let i = 0; i < 6; i++) s = apply(s, { type: 'pass' })
    expect(s.winner).toBe(null)
  })

  it('attrition only on empty hands; center doubles; tie goes to the center', () => {
    const f = empty()
    f[4] = piece('support', 0) // 1 x2 = 2
    f[0] = piece('flag', 1) // 2
    let s = mid(f, [[], []])
    s = apply(s, { type: 'pass' })
    expect(s.winner).toBe(0)
    expect(s.reason).toBe('attrition')
  })
})

describe('cards', () => {
  const pc = (id: string, fields: Record<string, string>): PackCard => ({
    id,
    name: id,
    w: 63,
    h: 88,
    fields,
    front: '',
    back: null,
  })
  it('reads _UW fields and lists problems', () => {
    const pack = [
      pc('a', { Ability_UW: 'flag', Firepower_UW: '2' }),
      pc('b', { Ability_UW: 'zap', Firepower_UW: '1' }),
    ]
    expect(isUrbanPack(pack)).toBe(true)
    const r = cardsFromPack(pack)
    expect(r.cards).toHaveLength(1)
    expect(r.issues.length).toBeGreaterThan(0)
  })
})

describe('bots', () => {
  const pool = (['flag', 'nil', 'support', 'bomb'] as Kind[]).map((k) => ({
    packId: k,
    name: k,
    kind: k,
    fp: FP[k],
  }))
  it('random games play only legal moves', () => {
    // Passing no longer ends the game, so a random game may run past the cap.
    for (let g = 0; g < 200; g++) {
      let s = createGame(deal(pool), (g % 2) as Seat)
      for (let i = 0; i < 500 && s.winner === null; i++) s = apply(s, easyMove(s))
      expect(s.winner !== null || legalMoves(s).length > 0).toBe(true)
    }
  })
  it('normal bot beats easy most games', () => {
    let wins = 0
    for (let g = 0; g < 10; g++) {
      let s = createGame(deal(pool), (g % 2) as Seat)
      for (let i = 0; i < 300 && s.winner === null; i++)
        s = apply(s, s.turn === 0 ? normalMove(s, 1) : easyMove(s))
      if (s.winner === 0) wins++
    }
    expect(wins).toBeGreaterThanOrEqual(6)
  })
})
