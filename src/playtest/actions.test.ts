import { describe, expect, it } from 'vitest'
import { applyAction, observe, seenBy, type TableAction } from './actions'
import { shuffle } from './rng'
import {
  adjacent,
  adventureScuffle,
  presets,
  simpleBoard,
  slotName,
  slotRect,
  tableLayout,
  validateSetup,
  zoneKey,
} from './setup'
import { createTable, locate, piecesIn, type DeckCards, type TableState } from './state'

const CARD = { w: 63, h: 88 }
const setup = adventureScuffle(CARD)
const deck = (prefix: string, n = 12): DeckCards =>
  Array.from({ length: n }, (_, i) => ({ cardId: `${prefix}${i + 1}`, name: `${prefix} ${i + 1}` }))
const fresh = () => createTable(setup, [deck('A'), deck('B')], 42)
const run = (s: TableState, ...actions: TableAction[]) =>
  actions.reduce((st, a) => applyAction(setup, st, a), s)
const support = (seat: number) => zoneKey('support', seat)
const field = (seat: number) => zoneKey('field', seat)

describe('setups', () => {
  it('presets are valid at several card sizes', () => {
    for (const card of [CARD, { w: 86, h: 54 }, { w: 30, h: 30 }])
      for (const s of presets(card)) expect(validateSetup(s), s.name).toEqual([])
  })

  it('catches broken setups', () => {
    const bad = { ...simpleBoard(CARD), name: ' ', seats: [] }
    expect(validateSetup(bad)).toEqual(
      expect.arrayContaining(['The setup needs a name.', 'A game has 1 to 4 players.']),
    )
    const off = adventureScuffle(CARD)
    off.zones[0].x = off.seatArea.w
    expect(validateSetup(off).join()).toMatch(/outside its seat area/)
  })

  it('names and neighbours grid slots', () => {
    const f = setup.zones[0]
    expect(slotName(f, 1)).toBe('Front Line Center')
    expect(slotName(f, 3)).toBe('Rear Guard Flank (left)')
    expect(adjacent(f, 0).sort()).toEqual([1, 3])
    expect(adjacent(f, 4).sort()).toEqual([1, 3, 5])
  })

  it('lines the two fields up, with each Rest zone on its own side', () => {
    const lay = tableLayout(setup)
    const at = (key: string) => lay.zones.find((z) => z.key === key)!
    expect(at(field(1)).x).toBeCloseTo(at(field(0)).x)
    expect(at(field(1)).w).toBeCloseTo(at(field(0)).w)
    expect(at(zoneKey('rest', 0)).x).toBeGreaterThan(at(field(0)).x)
    expect(at(zoneKey('rest', 1)).x).toBeLessThan(at(field(1)).x)
  })

  it('turns the top seat around so the front lines face each other', () => {
    const lay = tableLayout(setup)
    const top = lay.zones.find((z) => z.key === field(1))!
    const bottom = lay.zones.find((z) => z.key === field(0))!
    expect(top.turned).toBe(true)
    expect(top.y).toBeLessThan(bottom.y)
    const f = setup.zones[0]
    // Front Line (row 0) is at the bottom of the turned grid, its left flank on the right.
    const r = slotRect(f, 0, true)
    expect(r.y).toBeGreaterThan(0)
    expect(r.x).toBeGreaterThan(0)
    expect(slotRect(f, 0, false)).toMatchObject({ x: 0, y: 0 })
    // Nothing sticks out of the table.
    for (const z of lay.zones) {
      expect(z.x + z.w).toBeLessThanOrEqual(lay.w + 0.01)
      expect(z.y + z.h).toBeLessThanOrEqual(lay.h + 0.01)
    }
  })
})

describe('creating a table', () => {
  it('deals each deck to its seat with tokens and counters', () => {
    const s = fresh()
    expect(piecesIn(s, support(0))).toHaveLength(12)
    expect(piecesIn(s, support(1))).toHaveLength(12)
    expect(Object.values(s.pieces).every((p) => !p.faceUp && p.state === 'ready')).toBe(true)
    expect(Object.values(s.tokens)).toHaveLength(2)
    expect(s.counters).toEqual({ [zoneKey('points', 0)]: 0, [zoneKey('points', 1)]: 0 })
  })

  it('shuffles a dealt pile but keeps a hand in deck order', () => {
    const b = simpleBoard(CARD)
    const t = createTable(b, [deck('A'), deck('B')], 7)
    const names = piecesIn(t, zoneKey('deck', 0)).map((id) => t.pieces[id].name)
    expect(names).not.toEqual(deck('A').map((c) => c.name))
    expect([...names].sort()).toEqual(
      deck('A')
        .map((c) => c.name)
        .sort(),
    )
    const s = fresh()
    expect(piecesIn(s, support(0)).map((id) => s.pieces[id].name)).toEqual(
      deck('A').map((c) => c.name),
    )
  })
})

describe('actions', () => {
  it('moves a card to a slot, face down by the zone rule, and logs it without its name', () => {
    const s0 = fresh()
    const id = piecesIn(s0, support(0))[0]
    const s = run(s0, { t: 'move', piece: id, to: { zone: field(0), slot: 1 } })
    expect(locate(s, id)).toMatchObject({ key: field(0), slot: 1 })
    expect(s.pieces[id].faceUp).toBe(false)
    expect(s.log.at(-1)!.text).toBe("a face-down card → Player 1's Field, Front Line Center")
    // The earlier state is untouched (undo keeps old states).
    expect(locate(s0, id)?.key).toBe(support(0))
  })

  it('dropping on an occupied slot swaps the two cards', () => {
    const [a, b] = piecesIn(fresh(), support(0))
    const s = run(
      fresh(),
      { t: 'move', piece: a, to: { zone: field(0), slot: 0 } },
      { t: 'move', piece: b, to: { zone: field(0), slot: 2 } },
      { t: 'move', piece: a, to: { zone: field(0), slot: 2 } },
    )
    expect(locate(s, a)?.slot).toBe(2)
    expect(locate(s, b)?.slot).toBe(0)
    expect(s.log.at(-1)!.text).toMatch(/^Swapped/)
  })

  it('a card going to Support or Rest is reset and loses its tokens', () => {
    const id = piecesIn(fresh(), support(0))[0]
    const token = Object.values(fresh().tokens).find((t) => t.owner === 0)!.id
    const s = run(
      fresh(),
      { t: 'move', piece: id, to: { zone: field(0), slot: 0 } },
      { t: 'flip', piece: id },
      { t: 'state', piece: id, state: 'attacking' },
      { t: 'token', token, to: { piece: id } },
      { t: 'move', piece: id, to: { zone: zoneKey('rest', 0) } },
    )
    expect(s.pieces[id]).toMatchObject({ faceUp: true, state: 'ready' })
    expect(s.tokens[token].at).toEqual({ pool: true })
    expect(s.log.map((l) => l.text)).toContain('A 1: Attacking')
  })

  it('random setup fills six random field slots per seat, repeatably', () => {
    const a = run(fresh(), { t: 'randomSetup' })
    const b = run(fresh(), { t: 'randomSetup' })
    for (const seat of [0, 1]) {
      expect(a.zones[field(seat)].slots!.every((s) => s.length === 1)).toBe(true)
      expect(piecesIn(a, support(seat))).toHaveLength(6)
    }
    expect(a.zones).toEqual(b.zones)
  })

  it('shuffle, random pick, coin and dice use the table seed', () => {
    const s = run(
      fresh(),
      { t: 'shuffle', zone: support(0) },
      { t: 'pick', zone: support(1) },
      { t: 'coin' },
    )
    expect(piecesIn(s, support(0))).toEqual(shuffle(piecesIn(fresh(), support(0)), fresh().seed)[0])
    expect(piecesIn(fresh(), support(1))).toContain(s.last.picked)
    expect(['Heads', 'Tails']).toContain(s.last.coin)
    expect(run(fresh(), { t: 'coin' }).last).toEqual(run(fresh(), { t: 'coin' }).last)
    const b = simpleBoard(CARD)
    const r = applyAction(b, createTable(b, [null, null], 1), { t: 'roll', dice: 'd6' })
    expect(r.last.roll!.values).toHaveLength(2)
    expect(r.last.roll!.values.every((v) => v >= 1 && v <= 6)).toBe(true)
  })

  it('points stop at the maximum and four points win', () => {
    const k = zoneKey('points', 1)
    let s = run(
      fresh(),
      ...Array.from({ length: 3 }, () => ({ t: 'counter', key: k, delta: 1 }) as const),
    )
    expect(s.winner).toBeNull()
    s = run(s, { t: 'counter', key: k, delta: 1 }, { t: 'counter', key: k, delta: 1 })
    expect(s.counters[k]).toBe(4)
    expect(s.winner).toEqual({ seat: 1, reason: 'Points reached 4' })
    expect(s.log.at(-1)!.text).toBe('Player 2 wins (Points 4).')
    // Below the minimum: nothing changes (the same state comes back, no log line).
    const s0 = fresh()
    expect(applyAction(setup, s0, { t: 'counter', key: k, delta: -1 })).toBe(s0)
  })

  it('phases wrap into the next round; initiative passes', () => {
    let s = run(
      fresh(),
      { t: 'phase', delta: 1 },
      { t: 'phase', delta: 1 },
      { t: 'phase', delta: 1 },
    )
    expect([s.round, s.phase]).toEqual([2, 0])
    s = run(s, { t: 'phase', delta: -1 })
    expect([s.round, s.phase]).toEqual([1, 2])
    s = run(s, { t: 'initiative', seat: 1 })
    expect(s.initiative).toBe(1)
    expect(s.log.at(-1)!.text).toBe('Initiative: Player 2')
  })
})

describe('hidden information', () => {
  it('face-down cards are known to their owner only; a hidden pile to nobody', () => {
    const s = run(fresh(), { t: 'randomSetup' })
    const mine = piecesIn(s, field(0))[0]
    expect(seenBy(setup, s, mine, 0)).toBe('peek')
    expect(seenBy(setup, s, mine, 1)).toBe('back')
    expect(seenBy(setup, s, mine, null)).toBe('peek')
    const up = run(s, { t: 'flip', piece: mine })
    expect(seenBy(setup, up, mine, 1)).toBe('face')
    const b = simpleBoard(CARD)
    const t = createTable(b, [deck('A'), null], 3)
    expect(seenBy(b, t, piecesIn(t, zoneKey('deck', 0))[0], 0)).toBe('back')
  })

  it('observe removes what a seat cannot see', () => {
    const s = run(fresh(), { t: 'randomSetup' })
    const o = observe(setup, s, 1)
    const mine = piecesIn(s, field(0))[0]
    expect(o.pieces[mine].cardId).toBe('')
    const theirs = piecesIn(s, field(1))[0]
    expect(o.pieces[theirs].cardId).toBe(s.pieces[theirs].cardId)
  })
})

describe('geometry', () => {
  it('centres field cards in their slots and turns them', async () => {
    const { pieceBoxes, targetAt } = await import('./geometry')
    const lay = tableLayout(setup)
    let s = run(fresh(), { t: 'randomSetup' })
    const id = s.zones[field(0)].slots![0][0]
    s = run(s, { t: 'state', piece: id, state: 'attacking' })
    const boxes = pieceBoxes(setup, lay, s, () => CARD)
    const b = boxes.find((x) => x.id === id)!
    expect(b.rotation).toBe(90)
    const pz = lay.zones.find((z) => z.key === field(0))!
    expect(targetAt(pz, b.cx, b.cy, boxes)).toEqual({ zone: field(0), slot: 0 })
    // The turned seat's slot 0 is found where it is drawn.
    const top = lay.zones.find((z) => z.key === field(1))!
    const t = boxes.find((x) => x.id === s.zones[field(1)].slots![0][0])!
    expect(targetAt(top, t.cx, t.cy, boxes)).toEqual({ zone: field(1), slot: 0 })
    // Support holds the other six in a row, all inside the zone.
    const sup = lay.zones.find((z) => z.key === support(0))!
    const row = boxes.filter((x) => x.zone === support(0))
    expect(row).toHaveLength(6)
    for (const r of row) {
      expect(r.cx - r.w / 2).toBeGreaterThanOrEqual(sup.x)
      expect(r.cx + r.w / 2).toBeLessThanOrEqual(sup.x + sup.w + 0.01)
    }
  })
})

describe('decks', () => {
  it('expands counts in card order, or takes every card once', async () => {
    const { deckCards } = await import('./state')
    const cards = [
      { id: 'b', name: 'Bee', order: 2 },
      { id: 'a', name: 'Ant', order: 1 },
      { id: 'c', name: '', order: 3 },
    ]
    expect(deckCards(cards, { a: 2, b: 1 }).map((c) => c.cardId)).toEqual(['a', 'a', 'b'])
    expect(deckCards(cards, null).map((c) => c.name)).toEqual(['Ant', 'Bee', 'Card'])
  })
})
