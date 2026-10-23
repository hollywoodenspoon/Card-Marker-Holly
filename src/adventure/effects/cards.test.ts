import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import {
  apply,
  createGame,
  isLegal,
  legalMoves,
  placePool,
  responseMoves,
  restFsCards,
  revealOptions,
  type Move,
} from '../engine'
import { ARCHIVE_SETS } from '../fixtures/archiveSets'
import { FIRST_QUEST, FIRST_QUEST_DECKS, fq } from '../fixtures/firstQuest'
import type { AsCard } from '../cards'
import type { AsState, CardState, Seat } from '../state'
import { engagementSides, engagementTotals, lockCombat, statsAt } from '../stats'
import { archInRest, isLocked, restCount } from './helpers'
import { unreadParts } from './registry'

/** One player's side for a test board. Field cards are face up and Ready unless listed. */
interface Side {
  field?: (number | null)[]
  down?: number[]
  states?: Partial<Record<number, CardState>>
  support?: number[]
  rest?: number[]
}

/**
 * A Skirmish board where `respond` must respond. The last field position
 * stays face down on both sides unless given, so the Skirmish isn't over yet.
 */
function board(a: Side, b: Side, opts: { initiative?: Seat; respond?: Seat } = {}): AsState {
  const s = createGame({
    cards: FIRST_QUEST,
    decks: [FIRST_QUEST_DECKS["Adventurer's Guild"], FIRST_QUEST_DECKS["Hero's Retinue"]],
    names: ['Ann', 'Bo'],
    seed: 9,
  })
  return produce(s, (d) => {
    d.initiative = opts.initiative ?? 0
    d.phase = 'skirmish'
    d.skirmish = { reveals: 2, last: 1 }
    ;[a, b].forEach((side, seat) => {
      const p = d.players[seat]
      const field = side.field ?? []
      const filler = [40, 42][seat]
      p.field = Array.from({ length: 6 }, (_, i) => {
        const n = i < field.length ? field[i] : i === 5 ? filler : null
        const down = side.down ?? (i >= field.length && i === 5 ? [5] : [])
        return n === null
          ? { card: null, faceUp: false, state: 'ready' }
          : { card: fq(n), faceUp: !down.includes(i), state: side.states?.[i] ?? 'ready' }
      })
      p.support = (side.support ?? []).map(fq)
      p.rest = (side.rest ?? []).map(fq)
      p.spent = []
    })
    d.step = { k: 'respond', seat: opts.respond ?? 0, final: false }
  })
}

/** A Combat board: states given per position, an Engagement where `attacker` attacks. */
function combat(
  a: Side & { main?: number },
  b: Side & { main?: number },
  attacker: Seat,
  opts: { initiative?: Seat; done?: AsState['results'] } = {},
) {
  const s = board(a, b, opts)
  return produce(s, (d) => {
    d.phase = 'combat'
    d.players[0].mainAttacker = a.main ?? null
    d.players[1].mainAttacker = b.main ?? null
    for (const p of d.players) for (const f of p.field) f.faceUp = !!f.card
    // A spare Support card each, so the Engagement doesn't end by itself.
    d.players[0].support.push(fq(19))
    d.players[1].support.push(fq(18))
    d.results = opts.done ?? []
    d.queue = []
    d.engagement = { attacker, fs: [[], []], passed: [false, false], tried: [] }
    d.step = { k: 'fs', seat: d.initiative }
  })
}

function must(s: AsState, m: Move): AsState {
  expect(isLegal(s, m), `${JSON.stringify(m)} at ${JSON.stringify(s.step)}`).toBe(true)
  return apply(s, m)
}
/** Answer the current choice by the card or slot it names. */
function pick(s: AsState, match: string | number): AsState {
  expect(s.step.k, JSON.stringify(s.step)).toBe('choose')
  const st = s.step as Extract<AsState['step'], { k: 'choose' }>
  const o = st.options.find((x) =>
    typeof match === 'number' ? x.slot === match : x.id === match || x.card === match,
  )
  expect(o, `${match} in ${JSON.stringify(st.options)}`).toBeTruthy()
  return must(s, { t: 'choose', id: o!.id })
}
const use = (s: AsState, n: number) => must(s, { t: 'ability', card: fq(n) })
const fsMove = (s: AsState, n: number, from?: 'rest') =>
  must(s, from ? { t: 'fs', card: fq(n), from } : { t: 'fs', card: fq(n) })
const lastFs = (s: AsState, seat: Seat) => s.engagement?.fs[seat].at(-1)
const canUse = (s: AsState, seat: Seat, n: number) =>
  responseMoves(s, seat).some((m) => m.t === 'ability' && m.card === fq(n))

describe('every First Quest card has its rules', () => {
  it('reads all 45 from their printed text', () => {
    for (const c of FIRST_QUEST) expect(unreadParts(c), c.code).toEqual([])
  })

  it('reads all 39 cards of the archive sets', () => {
    for (const c of ARCHIVE_SETS) expect(unreadParts(c), c.code).toEqual([])
  })
})

describe('Inherent stats', () => {
  it('TFQ-18 Weapon Master and TFQ-19 Shield-Bearer: Center +1 D, Flank +1 A', () => {
    const s = board({ field: [18, 19, 19] }, {})
    expect(statsAt(s, 0, 0)).toEqual({ a: 4, d: 2 })
    expect(statsAt(s, 0, 1)).toEqual({ a: 2, d: 4 })
    expect(statsAt(s, 0, 2)).toEqual({ a: 3, d: 3 })
  })

  it('only counts while face up', () => {
    const s = board({ field: [18], down: [0] }, {})
    expect(statsAt(s, 0, 0)).toEqual({ a: 3, d: 2 })
  })

  it('TFQ-23 Rianz Emissary: a Rianz card on the field +1 A, in the rest zone +1 D', () => {
    expect(statsAt(board({ field: [23] }, {}), 0, 0)).toEqual({ a: 2, d: 2 })
    // Hero of Rianz counts: the name contains "Rianz".
    expect(statsAt(board({ field: [23, 13] }, {}), 0, 0)).toEqual({ a: 3, d: 2 })
    expect(statsAt(board({ field: [23], rest: [20] }, {}), 0, 0)).toEqual({ a: 2, d: 3 })
    // A face-down Rianz card doesn't count.
    expect(statsAt(board({ field: [23, 17], down: [1] }, {}), 0, 0)).toEqual({ a: 2, d: 2 })
  })

  it('reads archetypes from Archetype_AS, falling back to the name', () => {
    const s = board({ field: [23, 2] }, {})
    // Spirited Knight is no Rianz card…
    expect(statsAt(s, 0, 0)).toEqual({ a: 2, d: 2 })
    // …until Archetype_AS says so.
    const tagged = produce(s, (d) => void (d.cards[fq(2)].archetypes = ['Rianz', 'Knight']))
    expect(statsAt(tagged, 0, 0)).toEqual({ a: 3, d: 2 })
    // A listed archetype replaces the name: a "Rianz" name tagged Grave isn't Rianz.
    const s2 = board({ field: [23, 17] }, {})
    expect(statsAt(s2, 0, 0)).toEqual({ a: 3, d: 2 })
    const retagged = produce(s2, (d) => void (d.cards[fq(17)].archetypes = ['Grave']))
    expect(statsAt(retagged, 0, 0)).toEqual({ a: 2, d: 2 })
  })

  it('TFQ-28 Grave Whisperer: Grave on the field +1 A, in the rest zone +1 D', () => {
    expect(statsAt(board({ field: [28, 26], rest: [29] }, {}), 0, 0)).toEqual({ a: 3, d: 3 })
  })

  it('TFQ-37 Unassuming Mage: +3 A and +3 D against a face-up Ace', () => {
    expect(statsAt(board({ field: [37] }, { field: [2] }), 0, 0)).toEqual({ a: 1, d: 1 })
    expect(statsAt(board({ field: [37] }, { field: [13] }), 0, 0)).toEqual({ a: 4, d: 4 })
    expect(statsAt(board({ field: [37] }, { field: [13], down: [0] }), 0, 0)).toEqual({
      a: 1,
      d: 1,
    })
  })

  it('TFQ-42 Backwards Blade: 2+ Rest Zone swaps A and D', () => {
    expect(statsAt(board({ field: [42], rest: [2] }, {}), 0, 0)).toEqual({ a: 1, d: 3 })
    expect(statsAt(board({ field: [42], rest: [2, 3] }, {}), 0, 0)).toEqual({ a: 3, d: 1 })
  })
})

describe('Battle Abilities (Fighting Spirit at reveal)', () => {
  // Ann (seat 0) attacks with 2 at position 0 into Bo's position 2 (defended by 5 at 2).
  const fight = (
    attacker: Seat,
    initiative: Seat,
    support0: number[],
    support1: number[],
    extra: Partial<Side> = {},
  ) =>
    combat(
      {
        field: [7, 9, 11, 3, 4, 6],
        states: {
          0: 'attacking',
          1: 'attacking',
          2: 'attacking',
          3: 'defending',
          4: 'defending',
          5: 'defending',
        },
        main: 0,
        support: support0,
        ...extra,
      },
      {
        field: [20, 21, 22, 23, 24, 30],
        states: {
          0: 'attacking',
          1: 'attacking',
          2: 'defending',
          3: 'attacking',
          4: 'defending',
          5: 'defending',
        },
        main: 0,
        support: support1,
      },
      attacker,
      { initiative },
    )

  it('TFQ-02 Spirited Knight: Attacking Side +1, Initiative +1', () => {
    expect(lastFs(fsMove(fight(0, 0, [2], []), 2), 0)?.value).toBe(3)
    expect(lastFs(fsMove(fight(1, 0, [2], []), 2), 0)?.value).toBe(2)
  })

  it('TFQ-03 Spiritforged Monk and TFQ-14 Barrier Wizard: Initiative +1, Defending Side +1', () => {
    expect(lastFs(fsMove(fight(1, 0, [3], []), 3), 0)?.value).toBe(3)
    expect(lastFs(fsMove(fight(0, 0, [14], []), 14), 0)?.value).toBe(2)
  })

  it('TFQ-26 Grave Jackal and TFQ-27 Grave Bloodsucker: initiative and 3+ rest, a Grave card on the field', () => {
    const grave = { field: [26, 9, 11, 3, 4, 6] }
    expect(lastFs(fsMove(fight(0, 0, [26], [], { rest: [2, 3, 5] }), 26), 0)?.value).toBe(2)
    expect(lastFs(fsMove(fight(0, 0, [26], [], { rest: [2, 3] }), 26), 0)?.value).toBe(1)
    expect(
      lastFs(fsMove(fight(0, 0, [27], [], { ...grave, field: [28, 9, 11, 3, 4, 6] }), 27), 0)
        ?.value,
    ).toBe(2)
    // Bo: no initiative, 3+ rest, a Grave card on the field: +2.
    let s = fight(0, 0, [], [27])
    s = produce(s, (d) => {
      d.players[1].rest = [fq(2), fq(3), fq(5)]
      d.players[1].field[2].card = fq(28)
    })
    s = must(s, { t: 'pass' })
    expect(lastFs(fsMove(s, 27), 1)?.value).toBe(3)
  })

  it('TFQ-34 Ghoulish Stalker: Strike (a Ghoulish card revealed before it this Engagement)', () => {
    expect(lastFs(fsMove(fight(0, 0, [39, 34], []), 34), 0)?.value).toBe(1)
    let s = fsMove(fight(0, 0, [39, 34], []), 39)
    s = must(s, { t: 'pass' })
    expect(lastFs(fsMove(s, 34), 0)?.value).toBe(2)
  })

  it('TFQ-38 Coin-Toss Bravo: Heads 2, Tails 0', () => {
    const values = new Set<number>()
    for (let seed = 0; seed < 20; seed++) {
      const s = produce(fight(0, 0, [38], []), (d) => void (d.seed = seed))
      values.add(lastFs(fsMove(s, 38), 0)!.value)
    }
    expect([...values].sort()).toEqual([0, 2])
  })

  it('TFQ-40 Lucky Charm Bearer: 2 or more in the rest zone +1', () => {
    expect(lastFs(fsMove(fight(0, 0, [40], [], { rest: [2] }), 40), 0)?.value).toBe(1)
    expect(lastFs(fsMove(fight(0, 0, [40], [], { rest: [2, 3] }), 40), 0)?.value).toBe(2)
    expect(lastFs(fsMove(fight(0, 0, [40], [], { rest: [2, 3, 5, 6] }), 40), 0)?.value).toBe(2)
  })

  it('TFQ-15 Saboteur Guard: Attacking Side, the opponent rests a Support card', () => {
    let s = fsMove(fight(0, 0, [15], [5, 6]), 15)
    expect(s.step).toMatchObject({ k: 'choose', seat: 1 })
    s = pick(s, fq(6))
    expect(s.players[1].rest).toContain(fq(6))
    expect(s.step).toEqual({ k: 'fs', seat: 1 })
    // Defending side: nothing happens.
    s = fsMove(fight(1, 0, [15], [5, 6]), 15)
    expect(s.players[1].support).toHaveLength(3)
  })

  it('TFQ-04 Strategic Vanguard: Defending Side: an attacker and a defender trade places in the stacks', () => {
    // Bo attacks Ann's position 2; Ann defends and reveals the Vanguard.
    let s = fsMove(fight(1, 0, [4, 8], []), 4)
    s = pick(s, 'use')
    // Ann's attack stack is 0 and 1; her defense of position 2 is 5.
    // The attacker at 0 joins the defense; the defender at 5, the only one, joins the attack.
    s = pick(s, 0)
    const f = s.players[0].field
    expect(f[0].state).toBe('defending')
    expect(f[5].state).toBe('attacking')
    // No cost: Spatial Witch stays in Support.
    expect(s.players[0].support).toContain(fq(8))
    // The moved card defends position 2 from position 0, far from it, at its own value.
    expect(engagementSides(s, 1)!.defenders).toEqual([0])
    expect(engagementTotals(s, s.engagement!).baseDefense).toBe(statsAt(s, 0, 0).d)
    // Ann's attack still comes from 0 and hits 2, and now stacks 1 and 5.
    const atk = engagementSides(s, 0)!
    expect([atk.main, atk.target, atk.attackers]).toEqual([0, 2, [1, 5]])
    expect(s.players[0].mainAttacker).toBe(0)
    expect(s.step).toEqual({ k: 'fs', seat: 1 })
  })

  it('TFQ-05 Decoy Ninja: No-Initiative, a ready field card becomes the Fighting Spirit', () => {
    // Bo has no initiative: Ann passes, then Bo reveals the Ninja.
    let s = fight(0, 0, [], [5])
    s = produce(s, (d) => void (d.players[1].field[1].state = 'ready'))
    s = must(s, { t: 'pass' })
    s = fsMove(s, 5)
    s = pick(s, 'use')
    expect(s.players[1].field[1].card).toBe(fq(5))
    expect(lastFs(s, 1)).toEqual({ card: fq(21), value: 2, from: 'field' })
    expect(s.players[1].spent).toEqual([fq(21)])
    // With the initiative it isn't offered.
    s = fight(0, 0, [5], [])
    s = produce(s, (d) => void (d.players[0].field[1].state = 'ready'))
    expect(fsMove(s, 5).step).toEqual({ k: 'fs', seat: 1 })
  })
})

describe('Rest-zone Fighting Spirit (Rest Abilities)', () => {
  const fight = (rest0: number[], field0: number[], done: AsState['results'] = []) =>
    combat(
      {
        field: field0,
        states: { 0: 'attacking', 1: 'defending', 2: 'defending' },
        main: 0,
        rest: rest0,
      },
      { field: [20, 21, 22], states: { 0: 'attacking', 1: 'defending', 2: 'defending' }, main: 0 },
      0,
      { done },
    )
  const restMoves = (s: AsState) =>
    legalMoves(s).flatMap((m) => (m.t === 'fs' && m.from === 'rest' ? [m.card] : []))

  it('TFQ-32 Ghoulish Assassin: with a Ghoulish card on your field, +1 FS, and it stays in the rest zone', () => {
    expect(restMoves(fight([32], [7, 8, 9]))).toEqual([])
    let s = fight([32], [39, 8, 9])
    expect(restMoves(s)).toEqual([fq(32)])
    s = fsMove(s, 32, 'rest')
    expect(lastFs(s, 0)).toEqual({ card: fq(32), value: 3, from: 'rest' })
    expect(s.players[0].rest).toContain(fq(32))
    // Not twice in one Engagement.
    s = must(s, { t: 'pass' })
    expect(restMoves(s)).toEqual([])
  })

  it('TFQ-33 Ghoulish Mammoth: with another Ghoulish card in your rest zone', () => {
    expect(restMoves(fight([33], [7, 8, 9]))).toEqual([])
    expect(restMoves(fight([33, 39], [7, 8, 9]))).toEqual([fq(33)])
  })

  it('TFQ-35 Undead Chimera and TFQ-36 Abominable Bishop: Second Engagement, after winning or losing the First', () => {
    const won = [{ attacker: 1 as Seat, attack: 1, defense: 5, scorer: 0 as Seat }]
    const lost = [{ attacker: 1 as Seat, attack: 5, defense: 1, scorer: 1 as Seat }]
    expect(restMoves(fight([35, 36], [7, 8, 9]))).toEqual([])
    expect(restMoves(fight([35, 36], [7, 8, 9], won))).toEqual([fq(35)])
    expect(restMoves(fight([35, 36], [7, 8, 9], lost))).toEqual([fq(36)])
    // A tie is neither.
    expect(restMoves(fight([35, 36], [7, 8, 9], [{ ...won[0], scorer: null }]))).toEqual([])
  })

  it("TFQ-43 Gambler's Gambit: Second Engagement, a coin; Heads +2 FS, Tails keeps the turn; once per Engagement", () => {
    const done = [{ attacker: 1 as Seat, attack: 1, defense: 1, scorer: null }]
    const results = new Set<string>()
    for (let seed = 0; seed < 20; seed++) {
      let s = produce(fight([43], [7, 8, 9], done), (d) => void (d.seed = seed))
      s = fsMove(s, 43, 'rest')
      const heads = !!lastFs(s, 0)
      results.add(heads ? `heads ${lastFs(s, 0)!.value}` : 'tails')
      // Heads: the turn passes to Bo. Tails: Ann still takes her turn, without the Gambit.
      expect(s.step).toEqual({ k: 'fs', seat: heads ? 1 : 0 })
      if (heads) s = must(s, { t: 'pass' })
      expect(restMoves(s)).toEqual([])
    }
    expect([...results].sort()).toEqual(['heads 3', 'tails'])
  })
})

describe('Field Abilities (responses)', () => {
  it('can be used by any face-up Ready card in a later response, and then the card is ability-active', () => {
    const s = board({ field: [7] }, { support: [5, 6] })
    expect(canUse(s, 0, 7)).toBe(true)
    expect(canUse(board({ field: [7], down: [0] }, { support: [5] }), 0, 7)).toBe(false)
    expect(canUse(board({ field: [7], states: { 0: 'ability' } }, { support: [5] }), 0, 7)).toBe(
      false,
    )
  })

  it('TFQ-07 Master Archer: the opponent picks a Support card to rest', () => {
    let s = use(board({ field: [7] }, { support: [5, 6] }), 7)
    expect(s.step).toMatchObject({ k: 'choose', seat: 1 })
    s = pick(s, fq(5))
    expect(s.players[1].rest).toEqual([fq(5)])
    expect(s.players[0].field[0].state).toBe('ability')
    // Without Support cards to rest, it can't be used.
    expect(canUse(board({ field: [7] }, {}), 0, 7)).toBe(false)
  })

  it('TFQ-08 Spatial Witch: an opponent ready card swaps with a random Support card (state and face kept), and is rested', () => {
    let s = use(board({ field: [8] }, { field: [20, 21], down: [1], support: [5] }), 8)
    s = pick(s, 1)
    expect(s.players[1].field[1]).toEqual({ card: fq(5), faceUp: false, state: 'ready' })
    expect(s.players[1].support).toEqual([])
    expect(s.players[1].rest).toEqual([fq(21)])
    // Ability-active cards can't be targeted (ready only).
    s = use(board({ field: [8] }, { field: [20, 21], states: { 0: 'ability' }, support: [5] }), 8)
    expect((s.step as { options: { slot?: number }[] }).options.map((o) => o.slot)).toEqual([1, 5])
  })

  it("TFQ-01 Crimson Duelist can't be the target of an opponent's Field Ability, but a Flip may target it", () => {
    let s = use(board({ field: [8] }, { field: [1, 21], support: [5] }), 8)
    // Crimson Duelist at 0 isn't offered.
    expect((s.step as { options: { slot?: number }[] }).options.map((o) => o.slot)).toEqual([1, 5])
    // Azure Assassin (Flip) may target it.
    s = board({}, { field: [1], support: [5] }, { respond: 0 })
    s = produce(s, (d) => {
      d.players[0].field[0] = { card: fq(16), faceUp: false, state: 'ready' }
      d.step = { k: 'reveal', seat: 1, count: 1 }
    })
    s = pick(must(s, { t: 'reveal', slots: [0] }), 0)
    expect(s.players[1].field[0].card).toBe(fq(5))
  })

  it('TFQ-09 Guild Quarter Master: swap a field card with a Support card, which enters Ready', () => {
    let s = use(board({ field: [9, 2], states: { 1: 'ability' }, support: [3] }, {}), 9)
    s = pick(s, 1)
    expect(s.players[0].field[1]).toEqual({ card: fq(3), faceUp: true, state: 'ready' })
    expect(s.players[0].support).toEqual([fq(2)])
    expect(s.players[0].field[0].state).toBe('ability')
  })

  it('TFQ-13 Hero of Rianz: Attack Unbound this round; Hero is ability-active', () => {
    let s = use(board({ field: [13] }, {}), 13)
    expect(s.players[0].round.attackUnbound).toBe(true)
    expect(s.players[0].field[0].state).toBe('ability')
    s = combat(
      {
        field: [7, 9, 11, 3, 4, 6],
        states: {
          0: 'attacking',
          1: 'defending',
          2: 'attacking',
          3: 'defending',
          4: 'defending',
          5: 'attacking',
        },
        main: 0,
      },
      { field: [20, 21, 22], states: { 2: 'defending' } },
      0,
    )
    expect(engagementSides(s, 0)!.attackers).toEqual([0])
    s = produce(s, (d) => void (d.players[0].round.attackUnbound = true))
    expect(engagementSides(s, 0)!.attackers).toEqual([0, 2, 5])
  })

  it('TFQ-17 Rianz Swindler: two opponent cards swap places; Ranger of the Tower (TFQ-22) stays put', () => {
    let s = use(board({ field: [17] }, { field: [2, 3, 22], down: [0] }), 17)
    s = pick(s, 0)
    s = pick(s, 1)
    expect(s.players[1].field[0]).toMatchObject({ card: fq(3), faceUp: true })
    expect(s.players[1].field[1]).toMatchObject({ card: fq(2), faceUp: false })
    s = use(board({ field: [17] }, { field: [2, 3, 22] }), 17)
    expect((s.step as { options: { slot?: number }[] }).options.map((o) => o.slot)).toEqual([
      0, 1, 5,
    ])
  })

  it('TFQ-30 Grave Reclaimer: Maneuver (Grave)', () => {
    let s = use(board({ field: [30, 26, 7] }, {}), 30)
    s = pick(s, 1)
    s = pick(s, 2)
    expect(s.players[0].field.map((f) => f.card).slice(0, 3)).toEqual([fq(30), fq(7), fq(26)])
    // It may move itself: with no other Grave card, it swaps with any card.
    s = use(board({ field: [30, 7] }, {}), 30)
    s = pick(s, 1)
    expect(s.players[0].field.map((f) => f.card).slice(0, 2)).toEqual([fq(7), fq(30)])
  })

  it('TFQ-31 Grave Keeper: Rest 1, an opponent ready card turns ability-active', () => {
    let s = use(board({ field: [31], support: [2, 41] }, { field: [20, 21] }), 31)
    // Runaway Familiar can't pay a cost, so Spirited Knight is rested without asking.
    s = pick(s, 1)
    expect(s.players[0].rest).toEqual([fq(2)])
    expect(s.players[1].field[1].state).toBe('ability')
    expect(canUse(board({ field: [31], support: [41] }, { field: [20] }), 0, 31)).toBe(false)
  })

  it("TFQ-44 Doppelganger Thief: Rest 2, copies a face-up opponent card's Field Ability", () => {
    let s = use(board({ field: [44], support: [2, 3, 5] }, { field: [7], support: [20, 21] }), 44)
    s = pick(s, fq(2))
    s = pick(s, fq(3))
    // The only Field Ability to copy is Master Archer's: Bo rests a Support card.
    s = pick(s, fq(21))
    expect(s.players[0].rest).toEqual([fq(2), fq(3)])
    expect(s.players[1].rest).toEqual([fq(21)])
    expect(s.players[0].field[0].state).toBe('ability')
    // It can't copy another Doppelganger Thief.
    expect(canUse(board({ field: [44], support: [2, 3] }, { field: [44] }), 0, 44)).toBe(false)
  })
})

describe('Support Abilities', () => {
  it('TFQ-11 Mission Handler: once per round, two ready cards swap places; it stays in Support', () => {
    let s = use(board({ field: [2, 3], support: [11] }, {}), 11)
    s = pick(s, 0)
    s = pick(s, 1)
    expect(s.players[0].field[0].card).toBe(fq(3))
    expect(s.players[0].rest).toEqual([])
    expect(s.players[0].support).toEqual([fq(11)])
    s = produce(s, (d) => void (d.step = { k: 'respond', seat: 0, final: false }))
    expect(canUse(s, 0, 11)).toBe(false)
  })

  it('TFQ-12 Hunter Dragoon: any opponent field card turns ability-active (a Crimson Duelist too), no cost', () => {
    let s = use(board({ support: [12, 2] }, { field: [1] }), 12)
    s = pick(s, 0)
    expect(s.players[1].field[0].state).toBe('ability')
    expect(s.players[0].rest).toEqual([fq(12)])
    expect(s.players[0].support).toEqual([fq(2)])
    // Usable on its own (nothing to pay).
    expect(canUse(board({ support: [12] }, { field: [1] }), 0, 12)).toBe(true)
  })

  it('TFQ-20 Rianz Sentinel: see a random opponent Support card; it stays in Support, once per round', () => {
    let s = use(board({ support: [20] }, { support: [5, 6] }), 20)
    expect(s.players[0].support).toEqual([fq(20)])
    expect(s.log.at(-1)?.text ?? '').not.toBe('')
    const line = s.log.find((l) => /Rianz Sentinel: Bo reveals/.test(l.text))
    // Revealed to both players: the line carries the card, for the table to show.
    expect(line?.cards).toHaveLength(1)
    expect([fq(5), fq(6)]).toContain(line!.cards![0])
    s = produce(s, (d) => void (d.step = { k: 'respond', seat: 0, final: false }))
    expect(canUse(s, 0, 20)).toBe(false)
  })

  it('TFQ-21 Light Dragoon: takes the place (and state) of a field card, which goes to Support; no cost', () => {
    let s = use(board({ field: [2, 3], states: { 1: 'ability' }, support: [21, 5] }, {}), 21)
    s = pick(s, 1)
    expect(s.players[0].field[1]).toEqual({ card: fq(21), faceUp: true, state: 'ability' })
    expect([...s.players[0].support].sort()).toEqual([fq(3), fq(5)].sort())
    expect(s.players[0].rest).toEqual([])
  })

  it('TFQ-29 Grave Acolyte: returns a Grave card; Discount keeps it with another Grave card resting', () => {
    let s = use(board({ support: [29], rest: [26] }, {}), 29)
    expect([...s.players[0].support].sort()).toEqual([fq(26)])
    expect(s.players[0].rest).toEqual([fq(29)])
    s = use(board({ support: [29], rest: [26, 27] }, {}), 29)
    s = pick(s, fq(26))
    expect([...s.players[0].support].sort()).toEqual([fq(26), fq(29)].sort())
    expect(s.players[0].rest).toEqual([fq(27)])
  })

  it('TFQ-41 Runaway Familiar goes to Support whenever it would be rested', () => {
    // Master Archer makes Bo rest a Support card: Bo picks the Familiar, and it stays.
    let s = use(board({ field: [7] }, { support: [41, 5] }), 7)
    s = pick(s, fq(41))
    expect([...s.players[1].support].sort()).toEqual([fq(41), fq(5)].sort())
    expect(s.players[1].rest).toEqual([])
  })
})

describe('Flip Abilities', () => {
  /** Bo reveals Ann's face-down card at position 0. */
  const reveal = (n: number, a: Side = {}, b: Side = {}) => {
    let s = board(a, b)
    s = produce(s, (d) => {
      d.players[0].field[0] = { card: fq(n), faceUp: false, state: 'ready' }
      d.step = { k: 'reveal', seat: 1, count: 1 }
    })
    return must(s, { t: 'reveal', slots: [0] })
  }

  it('TFQ-06 Vigilant Ranger: the opponent rests a Support card; the Ranger stays Ready', () => {
    let s = reveal(6, {}, { support: [5, 6] })
    s = pick(s, fq(6))
    expect(s.players[1].rest).toEqual([fq(6)])
    expect(s.players[0].field[0].state).toBe('ready')
  })

  it('TFQ-10 Haughty Knight: two opponent cards swap places', () => {
    let s = reveal(10, {}, { field: [2, 3] })
    s = pick(s, 0)
    s = pick(s, 1)
    expect(s.players[1].field[0].card).toBe(fq(3))
  })

  it('TFQ-16 Azure Assassin: an opponent ready card swaps with a random Support card', () => {
    let s = reveal(16, {}, { field: [2, 22], support: [5] })
    // Ranger of the Tower (1) can't be swapped off.
    expect((s.step as { options: { slot?: number }[] }).options.map((o) => o.slot)).toEqual([0, 5])
    s = pick(s, 0)
    expect(s.players[1].field[0].card).toBe(fq(5))
    expect(s.players[1].field[1].card).toBe(fq(22))
    // Nothing to swap with: nothing happens.
    s = reveal(16, {}, { field: [2] })
    expect(s.players[1].field[0].card).toBe(fq(2))
    expect(s.log.some((l) => /nothing to target/.test(l.text))).toBe(true)
  })

  it('TFQ-24 Howling Barbarian: an extra attacker whatever its Fate Number', () => {
    // Support on both sides, so Combat waits for Fighting Spirit.
    let s = reveal(24, { field: [null, 3, 4, 9, 15, 29], support: [2] }, { support: [5] })
    expect(s.players[0].round.extra).toEqual([fq(24)])
    // Finish the Skirmish: everything face up, final response.
    s = produce(s, (d) => {
      for (const p of d.players) for (const f of p.field) f.faceUp = !!f.card
      d.step = { k: 'respond', seat: d.initiative, final: true }
    })
    s = must(s, { t: 'pass' })
    const states = s.players[0].field.map((f) => f.state)
    // 5 ranked cards: 2 attack (Fate 537, 550) and 3 defend; the Barbarian (164) also attacks.
    expect(states).toEqual([
      'attacking',
      'attacking',
      'attacking',
      'defending',
      'defending',
      'defending',
    ])
    expect(s.players[0].mainAttacker).toBe(0)
  })

  it('TFQ-39 Ghoulish Trickster: Maneuver (Ghoulish), itself or a shown face-down Ghoulish card', () => {
    let s = reveal(39, { field: [null, 32, 7] }, {})
    s = pick(s, 1)
    s = pick(s, 2)
    expect(s.players[0].field[1].card).toBe(fq(7))
    expect(s.players[0].field[2].card).toBe(fq(32))
    // Alone, it moves itself.
    s = reveal(39, { field: [null, 7] }, {})
    s = pick(s, 1)
    expect(s.players[0].field[0].card).toBe(fq(7))
    expect(s.players[0].field[1]).toMatchObject({ card: fq(39), faceUp: true })
    // A face-down Ghoulish card is shown to prove it, and stays face down.
    s = reveal(39, { field: [null, 7, 32], down: [2] }, {})
    s = pick(s, 2)
    s = pick(s, 1)
    expect(s.players[0].field[1]).toMatchObject({ card: fq(32), faceUp: false })
    expect(s.log.some((l) => /shows the face-down Ghoulish Assassin/.test(l.text))).toBe(true)
  })

  it('TFQ-45 Wildcard Wanderer: swap a field card with a Support card (Ready)', () => {
    let s = reveal(45, { field: [null, 2], support: [3, 5] }, {})
    s = pick(s, 1)
    s = pick(s, fq(5))
    expect(s.players[0].field[1]).toEqual({ card: fq(5), faceUp: true, state: 'ready' })
  })
})

describe('Defense Unbound', () => {
  it('TFQ-25 Necromancer of Rotos: with 3+ cards in the rest zone, every defender counts', () => {
    const s = (rest: number[]) =>
      combat(
        { field: [7], states: { 0: 'attacking' }, main: 0 },
        {
          field: [25, 21, 22, 23, 24, 30],
          states: {
            0: 'defending',
            1: 'attacking',
            2: 'defending',
            3: 'defending',
            4: 'attacking',
            5: 'attacking',
          },
          rest,
        },
        0,
      )
    expect(engagementSides(s([2]), 0)!.defenders).toEqual([2])
    expect(engagementSides(s([2, 3, 5]), 0)!.defenders).toEqual([0, 2, 3])
    expect(engagementTotals(s([2, 3, 5]), s([2, 3, 5]).engagement!).defense).toBe(3 + 2 + 2)
  })
})

describe('keywords from the design archive (new card texts)', () => {
  /** Give card `n` another type and ability text. */
  const retext = (
    s: AsState,
    n: number,
    type: AsCard['type'],
    ability: string,
    archetypes?: string[],
  ) =>
    produce(s, (d) => {
      d.cards[fq(n)] = { ...d.cards[fq(n)], type, ability, ...(archetypes && { archetypes }) }
    })
  const fight = (support0: number[], text: string) =>
    retext(
      combat(
        {
          field: [7, 9, 11, 3, 4, 6],
          states: {
            0: 'attacking',
            1: 'attacking',
            2: 'attacking',
            3: 'defending',
            4: 'defending',
            5: 'defending',
          },
          main: 0,
          support: support0,
        },
        {
          field: [20, 21, 22, 23, 24, 30],
          states: { 0: 'defending', 1: 'defending', 2: 'defending', 3: 'attacking' },
        },
        0,
      ),
      2,
      'Battle',
      text,
    )

  it('Onslaught is left unread (it would count the card itself as an attacker)', () => {
    const s = fight([2], 'Onslaught 2+: +1 {fightingspirit_as}.')
    expect(lastFs(fsMove(s, 2), 0)?.value).toBe(1)
    expect(unreadParts(s.cards[fq(2)])).toEqual(['onslaught 2+: +1 fs'])
  })

  it('First Blood: the first card revealed this Engagement. Ambush: the opponent has passed', () => {
    const first = 'First Blood: +1 {fightingspirit_as}.'
    expect(lastFs(fsMove(fight([2], first), 2), 0)?.value).toBe(2)
    let s = fsMove(fight([39, 2], first), 39)
    s = must(s, { t: 'pass' })
    expect(lastFs(fsMove(s, 2), 0)?.value).toBe(1)
    const ambush = 'Ambush: +1 {fightingspirit_as}.'
    expect(lastFs(fsMove(fight([2], ambush), 2), 0)?.value).toBe(1)
    s = fsMove(fight([39, 2], ambush), 39)
    s = must(s, { t: 'pass' })
    expect(lastFs(fsMove(s, 2), 0)?.value).toBe(2)
  })

  it('a W card revealed before it this Engagement (this card not counted)', () => {
    const text =
      'If a Ghoulish card was revealed as Fighting Spirit this Engagement: +2 {fightingspirit_as}.'
    expect(lastFs(fsMove(fight([2], text), 2), 0)?.value).toBe(1)
    let s = fsMove(fight([39, 2], text), 39)
    s = must(s, { t: 'pass' })
    expect(lastFs(fsMove(s, 2), 0)?.value).toBe(3)
  })

  it('Override, Rest 2: non-adjacent cards (or one archetype) count this round', () => {
    let s = retext(
      board({ field: [7], support: [5, 6, 8] }, {}),
      7,
      'Field',
      'Defense Override, Rest 2: Non-adjacent cards are counted for defense.',
    )
    s = use(s, 7)
    s = pick(s, fq(5))
    s = pick(s, fq(6))
    expect(s.players[0].round.unbound).toEqual([{ side: 'defense' }])
    expect(s.players[0].rest).toEqual([fq(5), fq(6)])
    // "Non-adjacent Deepdelver cards are counted for attack": only those cards join.
    const c = combat(
      {
        field: [7, 9, 11, 3, 4, 6],
        states: {
          0: 'attacking',
          1: 'defending',
          2: 'attacking',
          3: 'defending',
          4: 'defending',
          5: 'attacking',
        },
        main: 0,
      },
      { field: [20, 21, 22], states: { 2: 'defending' } },
      0,
    )
    const tagged = produce(c, (d) => {
      d.cards[fq(6)].archetypes = ['Deepdelver']
      d.players[0].round.unbound = [{ side: 'attack', word: 'Deepdelver' }]
    })
    expect(engagementSides(tagged, 0)!.attackers).toEqual([0, 5])
  })

  it('returns any rest-zone card, and keeps the card with 3 or fewer in Support', () => {
    const text =
      'Put a card from your rest zone into your Support. This card does not need to be rested after use if you have 3 or fewer cards in Support.'
    let s = use(retext(board({ support: [29], rest: [26] }, {}), 29, 'Support', text), 29)
    expect([...s.players[0].support].sort()).toEqual([fq(26), fq(29)].sort())
    s = use(retext(board({ support: [29, 1, 2, 3], rest: [26] }, {}), 29, 'Support', text), 29)
    expect(s.players[0].rest).toEqual([fq(29)])
  })

  it('Target player rests a card from their Support: the owner picks the player', () => {
    let s = retext(
      board({ field: [7], support: [5] }, { support: [6] }),
      7,
      'Field',
      'Target player rests a card from their Support.',
    )
    s = use(s, 7)
    s = pick(s, 'seat:0')
    expect(s.players[0].rest).toEqual([fq(5)])
    expect(s.players[1].support).toEqual([fq(6)])
  })

  it("the opponent's Main Attacker in the Center, and a field card swapping itself", () => {
    const text = "If opponent's Main Attacker is in the Center: +1 {attack_as} and +1 {defense_as}."
    const s = retext(board({ field: [7] }, { field: [20, 21] }), 7, 'Inherent', text)
    const base = statsAt(s, 0, 0)
    const center = produce(s, (d) => void (d.players[1].mainAttacker = 1))
    expect(statsAt(center, 0, 0)).toEqual({ a: base.a + 1, d: base.d + 1 })
    const flank = produce(s, (d) => void (d.players[1].mainAttacker = 0))
    expect(statsAt(flank, 0, 0)).toEqual(base)
    let t = retext(
      board({ field: [7, 9] }, {}),
      7,
      'Field',
      "Swap this card's position with another card on your field.",
    )
    t = pick(use(t, 7), 1)
    expect(t.players[0].field[1].card).toBe(fq(7))
    expect(t.players[0].field[0].card).toBe(fq(9))
  })
})

describe('the archive sets: Final Blow, locks, Reef-Strider, Breakthrough', () => {
  const retext = (s: AsState, n: number, type: AsCard['type'], ability: string) =>
    produce(s, (d) => {
      d.cards[fq(n)] = { ...d.cards[fq(n)], type, ability }
    })
  /** Ann attacks from Front Line Left (attackers at 0, 1, 2); Bo defends at 0, 1, 2. */
  const fight = (support0: number[]) =>
    combat(
      {
        field: [7, 9, 11, 3, 4, 6],
        states: { 0: 'attacking', 1: 'attacking', 2: 'attacking', 3: 'defending' },
        main: 0,
        support: support0,
      },
      {
        field: [20, 21, 22, 23, 24, 30],
        states: { 0: 'defending', 1: 'defending', 2: 'defending', 3: 'attacking' },
      },
      0,
    )
  const lastResult = (s: AsState) => s.results.at(-1)!

  it('Final Blow: +1 when the Engagement ends, if it is still the last card revealed', () => {
    const fb = (s: AsState) => retext(s, 2, 'Battle', 'Final Blow: +1 {fightingspirit_as}.')
    // Ann reveals it, Bo passes, Ann passes: it was the last card.
    let s = fsMove(fb(fight([2])), 2)
    const before = engagementTotals(s, s.engagement!).attack
    expect(s.log.at(-1)!.text).toMatch(/Final Blow \+1 if it stays the last card revealed/)
    s = must(must(s, { t: 'pass' }), { t: 'pass' })
    expect(s.log.some((l) => l.text.startsWith('Final Blow:'))).toBe(true)
    expect(lastResult(s).attack).toBe(before + 1)
    // Bo reveals after it: no bonus.
    let t = fsMove(fb(fight([2])), 2)
    const base = engagementTotals(t, t.engagement!).attack
    t = fsMove(t, 18)
    // Ann passes; Bo has no Support left, so the Engagement ends.
    t = must(t, { t: 'pass' })
    expect(t.log.some((l) => l.text.startsWith('Final Blow:'))).toBe(false)
    expect(lastResult(t).attack).toBe(base)
  })

  it('Unmade Wretch: the card turns face down and ability-active, and cannot be revealed again', () => {
    const text =
      "Rest 2: Target opponent's card. Turn it face down. It cannot attack, defend, or activate any ability for the rest of the round."
    let s = retext(
      board({ field: [7], support: [5, 6, 8] }, { field: [2, 1, 3], down: [2, 5] }),
      7,
      'Field',
      text,
    )
    s = use(s, 7)
    s = pick(s, fq(5))
    s = pick(s, fq(6))
    // Crimson Duelist (TFQ-01) can't be the target of an opponent's Field Ability.
    const options = (s.step as { options: { slot?: number }[] }).options.map((o) => o.slot)
    expect(options).not.toContain(1)
    s = pick(s, 0)
    expect(s.players[1].field[0]).toMatchObject({ card: fq(2), faceUp: false, state: 'ability' })
    expect(s.players[1].round.sealed).toEqual([fq(2)])
    // Only the cards face down before can be revealed.
    const revealable = revealOptions(s, 0, 1).flat()
    expect(revealable).not.toContain(0)
    expect(revealable).toContain(2)
  })

  it('Rest Zone Lockouts: no Rest Ability, no refill; counted, archetype hidden; freed on leaving', () => {
    const lock = (kind: string) =>
      `Rest 1: Target a card in opponent's rest zone. Turn it face down. It cannot be used ${kind}.`
    // Bo has Ghoulish Assassin (Rest, needs a Ghoulish card on the field) resting.
    let s = retext(
      board({ field: [7], support: [5] }, { field: [39], rest: [32, 33] }),
      7,
      'Field',
      lock('for a Rest Ability for the rest of the game'),
    )
    const withEngagement = (x: AsState) =>
      produce(x, (d) => {
        d.engagement = { attacker: 0, fs: [[], []], passed: [false, false], tried: [] }
      })
    expect(restFsCards(withEngagement(s), 1)).toContain(fq(32))
    s = use(s, 7)
    s = pick(s, fq(32))
    expect(s.players[1].locked).toEqual([{ card: fq(32), kind: 'rest' }])
    expect(restFsCards(withEngagement(s), 1)).not.toContain(fq(32))
    // Still counted in the rest zone, but its archetype is hidden.
    expect(restCount(s, 1)).toBe(2)
    expect(archInRest(s, 1, 'Ghoulish', 'x')).toBe(true) // Ghoulish Mammoth still shows
    expect(isLocked(s, 1, fq(32), 'rest')).toBe(true)
    // Leaving the rest zone ends the lock.
    const freed = apply(
      produce(s, (d) => {
        d.players[1].rest = [fq(33)]
        d.players[1].support.push(fq(32))
      }),
      legalMoves(s)[0],
    )
    expect(freed.players[1].locked ?? []).toEqual([])
    // Trapsetter: a locked card can't refill the field.
    let t = retext(
      board({ field: [7], support: [5] }, { rest: [32, 33] }),
      7,
      'Field',
      lock('to refill their field during Regroup Phase'),
    )
    t = use(t, 7)
    t = pick(t, fq(33))
    const refill = produce(t, (d) => {
      d.phase = 'regroup'
      d.step = { k: 'place', seat: 1, from: 'rest', placed: [] }
    })
    expect(placePool(refill, 1)).toEqual([fq(32)])
  })

  it('Sahuagin Reef-Strider: a defender next to the attacked position, in the Center (defending side only)', () => {
    const text =
      'Defending Side, if a defending card adjacent to the attacked position is in the Center: +1 {fightingspirit_as}.'
    // Ann's Main Attacker at 0 attacks Bo's 2; Bo's 1 (Center) defends next to it.
    // Bo keeps a spare Support card, so the Engagement goes on after the reveal.
    const spare = produce(fight([]), (d) => void d.players[1].support.push(fq(16)))
    const s = must(retext(spare, 18, 'Battle', text), { t: 'pass' })
    expect(lastFs(fsMove(s, 18), 1)?.value).toBe(2)
    const noCenter = produce(s, (d) => void (d.players[1].field[1].state = 'attacking'))
    expect(lastFs(fsMove(noCenter, 18), 1)?.value).toBe(1)
    // A Center target: the Rear Guard Center below it counts.
    const center = produce(s, (d) => {
      d.players[0].mainAttacker = 1
      d.players[1].field[4].state = 'defending'
      d.players[1].field[1].state = 'defending'
    })
    expect(lastFs(fsMove(center, 18), 1)?.value).toBe(2)
  })

  it('Deepdelver Vanguard (Breakthrough): the attack turns Unbound when it is revealed', () => {
    const s = retext(
      fight([2]),
      2,
      'Battle',
      'Attacking Side: Non-adjacent cards are counted for attack.',
    )
    expect(engagementSides(s, 0)!.attackers).toEqual([0, 1])
    const before = engagementTotals(s, s.engagement!).attack
    const t = fsMove(s, 2)
    expect(engagementSides(t, 0)!.attackers).toEqual([0, 1, 2])
    expect(engagementTotals(t, t.engagement!).attack).toBe(before + statsAt(t, 0, 2).a + 1)
  })
})

describe('combat stacks', () => {
  // Ann attacks from 0 at Bo's position 2, Bo's Weapon Master (Center: +1 D) defends at 1.
  const start = () =>
    produce(
      combat(
        {
          field: [7, 9, 11, 3],
          states: { 0: 'attacking', 1: 'attacking', 2: 'attacking', 3: 'defending' },
          main: 0,
        },
        {
          field: [20, 18, 22, 23],
          states: { 0: 'attacking', 1: 'defending', 2: 'defending', 3: 'attacking' },
          main: 0,
        },
        0,
      ),
      (d) => void (d.combat = lockCombat(d)),
    )

  it('lock every value when combat starts, position bonuses included', () => {
    const s = start()
    const before = engagementTotals(s, s.engagement!)
    expect(engagementSides(s, 0)!.defenders).toEqual([1, 2])
    // Weapon Master moves to a Flank: it keeps its Center bonus and still defends.
    const moved = produce(s, (d) => {
      const f = d.players[1].field
      ;[f[1], f[5]] = [f[5], f[1]]
    })
    expect(engagementSides(moved, 0)!.defenders).toEqual([2, 5])
    expect(engagementTotals(moved, moved.engagement!)).toEqual(before)
  })

  it('add the cards an Unbound turned on during combat counts', () => {
    const s = start()
    expect(engagementSides(s, 0)!.attackers).toEqual([0, 1])
    const unbound = produce(s, (d) => void (d.players[0].round.attackUnbound = true))
    expect(engagementSides(unbound, 0)!.attackers).toEqual([0, 1, 2])
  })
})

describe('ability-active face-down cards', () => {
  it("don't trigger their Flip Ability when revealed (Grave Keeper, Hunter Dragoon)", () => {
    // Bo's Azure Assassin at 0 was turned ability-active face down; 1 is face up.
    const s = produce(
      board({ field: [7, 9] }, { field: [16, 21], down: [0], states: { 0: 'ability' } }),
      (d) => void (d.step = { k: 'reveal', seat: 0, count: 1 }),
    )
    const after = must(s, { t: 'reveal', slots: [0] })
    expect(after.players[1].field[0]).toMatchObject({ faceUp: true, state: 'ability' })
    expect(after.log.some((l) => l.text.startsWith('Flip Ability'))).toBe(false)
  })
})
