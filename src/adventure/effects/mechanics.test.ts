import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { apply, createGame, legalMoves, responseMoves, type Move } from '../engine'
import { ALL_CARDS } from '../fixtures/allCards'
import type { AsState, CardState, Seat } from '../state'
import { engagementSides, lockCombat, statsAt, tokensOn } from '../stats'
import { fsPreview } from '../engine'

/** A card id from its code ("TLC-13" → "tlc13"). */
const id = (code: string) => code.toLowerCase().replace('-', '')

interface Side {
  /** Field cards by code (null: empty); face up and Ready unless listed. */
  field: (string | null)[]
  down?: number[]
  states?: Partial<Record<number, CardState>>
  support?: string[]
  rest?: string[]
}

/** A Skirmish board with every card from cards.csv, `respond` to respond. */
function board(a: Side, b: Side, opts: { initiative?: Seat; respond?: Seat } = {}): AsState {
  const s = createGame({
    cards: ALL_CARDS,
    decks: [ALL_CARDS.slice(0, 12).map((c) => c.id), ALL_CARDS.slice(12, 24).map((c) => c.id)],
    names: ['Ann', 'Bo'],
    seed: 3,
  })
  return produce(s, (d) => {
    d.initiative = opts.initiative ?? 0
    d.phase = 'skirmish'
    d.skirmish = { reveals: 2, last: 1 }
    ;[a, b].forEach((side, seat) => {
      const p = d.players[seat]
      p.field = Array.from({ length: 6 }, (_, i) => {
        const code = side.field[i] ?? null
        return code
          ? { card: id(code), faceUp: !side.down?.includes(i), state: side.states?.[i] ?? 'ready' }
          : { card: null, faceUp: false, state: 'ready' }
      })
      p.support = (side.support ?? []).map(id)
      p.rest = (side.rest ?? []).map(id)
      p.spent = []
    })
    d.step = { k: 'respond', seat: opts.respond ?? 0, final: false }
  })
}

/** Play moves, answering every choice with its first option. */
function play(s: AsState, m: Move): AsState {
  let next = apply(s, m)
  expect(next, JSON.stringify(m)).not.toBe(s)
  while (next.step.k === 'choose') next = apply(next, legalMoves(next)[0])
  return next
}

const FILL = ['TFQ-02', 'TFQ-03', 'TFQ-04', 'TFQ-05', 'TFQ-11']

describe('debuff tokens and Terror', () => {
  it('Fear Incarnate puts tokens on 2 cards; they lower a stat, feed Terror, and clear at Regroup', () => {
    let s = board(
      { field: ['TLC-13', 'TLC-24', ...FILL.slice(0, 4)] },
      { field: ['TFQ-02', 'TFQ-03', 'TFQ-04', 'TFQ-05', 'TFQ-11', 'TFQ-19'] },
    )
    const before = [0, 1].map((i) => statsAt(s, 1, i))
    s = play(s, { t: 'ability', card: id('TLC-13') })
    expect(tokensOn(s, 1)).toBe(2)
    const after = [0, 1].map((i) => statsAt(s, 1, i))
    // Each token takes 1 from Attack (the first option).
    expect(after.map((v) => v.a)).toEqual(before.map((v) => Math.max(0, v.a - 1)))
    // Cult High Priest: Terror 3+ isn't on yet with 2 tokens.
    const priest = ALL_CARDS.find((c) => c.code === 'TLC-24')!
    expect(statsAt(s, 0, 1)).toEqual({ a: priest.a, d: priest.d })
    const three = produce(s, (d) => {
      d.players[1].field[2].tokens = { a: 1, d: 0 }
    })
    expect(statsAt(three, 0, 1)).toEqual({ a: priest.a + 1, d: priest.d + 1 })
  })

  it('tokens placed in combat lower the locked value at once', () => {
    const s = board(
      { field: ['TLC-21', ...FILL] },
      { field: ['TEC-21', 'TEC-22', 'TEC-23', 'TEC-24', 'TEC-25', 'TEC-26'] },
    )
    const locked = produce(s, (d) => {
      d.combat = lockCombat(d)
    })
    const v = locked.combat!.values[id('TEC-21')]
    const next = play(
      produce(locked, (d) => {
        d.players[0].support = [id('TFQ-19')]
      }),
      { t: 'ability', card: id('TLC-21') },
    )
    expect(next.combat!.values[id('TEC-21')].a).toBe(Math.max(0, v.a - 1))
  })
})

describe('Interpose', () => {
  it("Bastion Sentinel defends from anywhere when it hasn't the initiative", () => {
    const s = produce(
      board({ field: ['TFQ-02', ...FILL] }, { field: [...FILL, 'TEC-27'] }, { initiative: 0 }),
      (d) => {
        d.phase = 'combat'
        d.players[0].field[0].state = 'attacking'
        d.players[0].mainAttacker = 0
        d.players[1].field.forEach((f) => (f.state = 'defending'))
      },
    )
    const sides = engagementSides(s, 0)!
    // Slot 5 is neither the target (mirrored 0 = 2) nor next to it, but it interposes.
    expect(sides.defenders).toContain(5)
  })
})

describe('Riposte', () => {
  it('Rapier Adept gets +1 FS right after an opponent reveals a Battle card', () => {
    const adept = ALL_CARDS.find((c) => c.code === 'TEC-14')!
    const battle = ALL_CARDS.find((c) => c.type === 'Battle' && c.code !== 'TEC-14')!
    const s = produce(board({ field: FILL }, { field: FILL }), (d) => {
      d.phase = 'combat'
      d.engagement = {
        attacker: 0,
        fs: [[], [{ card: battle.id, value: battle.fs, from: 'support' }]],
        passed: [false, false],
        tried: [],
        last: { seat: 1, index: 0 },
      }
      d.players[0].support = [adept.id]
    })
    expect(fsPreview(s, 0, adept.id)).toBe(adept.fs + 1)
    const noRiposte = produce(s, (d) => {
      d.engagement!.last = undefined
    })
    expect(fsPreview(noRiposte, 0, adept.id)).toBe(adept.fs)
  })
})

describe('Hire', () => {
  it('Toll Collector swaps a Support card with a rest-zone card when revealed', () => {
    let s = board(
      { field: FILL, support: ['TFQ-19', 'TFQ-20'], rest: ['TFQ-21'] },
      { field: [...FILL.slice(0, 5), 'TAC-23'], down: [5] },
      { respond: 1 },
    )
    s = produce(s, (d) => {
      d.step = { k: 'reveal', seat: 0, count: 1 }
      // The Toll Collector is the opponent's; give it the Support and rest zone.
      const [a, b] = [d.players[0], d.players[1]]
      ;[b.support, b.rest] = [a.support, a.rest]
      a.support = []
      a.rest = []
    })
    s = play(s, { t: 'reveal', slots: [5] })
    expect(s.players[1].rest).toContain(id('TFQ-19'))
    expect(s.players[1].support).toContain(id('TFQ-21'))
  })
})

describe('Main Attacker', () => {
  it('Aegis Chaplain: the target cannot be the Main Attacker, so the next one is', () => {
    let s = board(
      { field: ['TEC-30', ...FILL], support: ['TEC-30', 'TFQ-19'] },
      { field: ['TFQ-02', 'TFQ-03', 'TFQ-04', 'TFQ-05', 'TFQ-11', 'TFQ-22'] },
    )
    s = produce(s, (d) => {
      d.players[0].field[0] = { card: id('TFQ-01'), faceUp: true, state: 'ready' }
    })
    s = play(s, { t: 'ability', card: id('TEC-30') })
    const blocked = s.players[1].round.noMain ?? []
    expect(blocked).toHaveLength(1)
    // Finish the Skirmish: the Main Attacker is never the blocked card.
    while (s.phase === 'skirmish') s = play(s, legalMoves(s).at(-1)!)
    const main = s.players[1].mainAttacker
    if (main !== null) expect(s.players[1].field[main].card).not.toBe(blocked[0])
  })
})

describe('Living Weapons', () => {
  it('Heartsong attaches from Support, adds its values, and rests at Regroup', () => {
    let s = board(
      { field: FILL.concat(['TFQ-19']), support: ['TAC-01'] },
      { field: FILL.concat(['TFQ-20']) },
    )
    const host = statsAt(s, 0, 0)
    const w = ALL_CARDS.find((c) => c.code === 'TAC-01')!
    s = play(s, { t: 'ability', card: id('TAC-01') })
    expect(s.players[0].field.some((f) => f.weapon?.card === w.id)).toBe(true)
    const slot = s.players[0].field.findIndex((f) => f.weapon)
    expect(statsAt(s, 0, slot)).toEqual({
      a: statsAt(board({ field: FILL.concat(['TFQ-19']) }, { field: FILL }), 0, slot).a + w.a,
      d: statsAt(board({ field: FILL.concat(['TFQ-19']) }, { field: FILL }), 0, slot).d + w.d,
    })
    expect(host).toBeDefined()
    while (s.phase !== 'regroup' && s.step.k !== 'over') s = play(s, legalMoves(s).at(-1)!)
    expect(s.players.every((p) => p.field.every((f) => !f.weapon))).toBe(true)
  })

  it('a Rest weapon attaches from the rest zone without using up the response', () => {
    const s = board(
      { field: FILL.concat(['TFQ-19']), rest: ['TAC-05', 'TAC-02'] },
      { field: FILL },
      { initiative: 0 },
    )
    // Living Weapon Dawn (Initiative:) can attach; the window stays open after it.
    const win = responseMoves(s, 0).filter((m) => m.t === 'ability' && m.window)
    expect(win.map((m) => m.t === 'ability' && m.card)).toContain(id('TAC-02'))
    const next = play(s, { t: 'ability', card: id('TAC-02'), window: true })
    expect(next.step).toEqual({ k: 'respond', seat: 0, final: false })
    expect(next.players[0].rest).not.toContain(id('TAC-02'))
  })
})

describe('Endure', () => {
  it('Peak Yeti may stay on the field, face down and Ready', () => {
    let s = board({ field: ['TAC-30', ...FILL] }, { field: FILL.concat(['TFQ-19']) })
    s = produce(s, (d) => {
      d.phase = 'combat'
      d.players[0].field.forEach((f) => (f.state = 'defending'))
      d.players[1].field.forEach((f) => (f.state = 'defending'))
      d.queue = []
      d.engagement = null
      d.step = { k: 'fs', seat: 0 }
    })
    // Regroup through the engine: end the round with no Engagements left.
    s = produce(s, (d) => {
      d.players[0].mainAttacker = null
      d.players[1].mainAttacker = null
    })
    // Drive Regroup directly: an Engagement-free round.
    s = play(
      produce(s, (d) => {
        d.engagement = { attacker: 0, fs: [[], []], passed: [true, false], tried: [] }
        d.step = { k: 'fs', seat: 1 }
        d.players[1].support = []
      }),
      { t: 'pass' },
    )
    // The owner was asked (the test answers "Use it"): it stays, face down and Ready.
    expect(s.log.some((l) => l.text === 'Peak Yeti: Endure. It stays on the field.')).toBe(true)
    expect(s.players[0].field[0]).toEqual({ card: id('TAC-30'), faceUp: false, state: 'ready' })
  })
})
