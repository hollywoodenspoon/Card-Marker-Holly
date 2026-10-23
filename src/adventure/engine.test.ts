import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { ADJACENT_PAIRS, mirrored, neighbours, slotName } from './board'
import { actor, apply, createGame, isLegal, legalMoves, type Move } from './engine'
import { basicCards, basicDecks } from './fixtures/basic'
import { HIDDEN, observeAs } from './observe'
import { other, type AsState, type Seat } from './state'
import { engagementSides, engagementTotals, lockCombat } from './stats'

const newGame = (seed = 7) =>
  createGame({ cards: basicCards(), decks: basicDecks(), names: ['Ann', 'Bo'], seed })

/** Play a move that must be legal. */
function must(s: AsState, m: Move): AsState {
  expect(isLegal(s, m), `${JSON.stringify(m)} at ${JSON.stringify(s.step)}`).toBe(true)
  return apply(s, m)
}

/** Each player puts their Support in order on positions 0…5, then confirms. */
function placeInOrder(s: AsState): AsState {
  while (s.step.k === 'place') {
    const st = s.step
    const p = s.players[st.seat]
    const slot = p.field.findIndex((f) => !f.card)
    s =
      slot >= 0 && p[st.from].length
        ? must(s, { t: 'place', card: p[st.from][0], slot })
        : must(s, { t: 'done' })
  }
  return s
}

/** Reveal with the first legal choice until the Skirmish is over. */
function revealAll(s: AsState): AsState {
  while (s.step.k === 'reveal' || s.step.k === 'respond') s = must(s, legalMoves(s)[0])
  return s
}

const pass = (s: AsState) => must(s, { t: 'pass' })

describe('the field', () => {
  it('knows neighbours, mirrored positions and names', () => {
    expect(neighbours(0)).toEqual([1, 3])
    expect(neighbours(1)).toEqual([0, 2, 4])
    expect(neighbours(4)).toEqual([1, 3, 5])
    expect(mirrored(0)).toBe(2)
    expect(mirrored(1)).toBe(1)
    expect(mirrored(5)).toBe(3)
    expect(ADJACENT_PAIRS).toHaveLength(7)
    expect(slotName(0)).toBe('Front Line Left Flank')
    expect(slotName(4)).toBe('Rear Guard Center')
  })
})

describe('setup', () => {
  it('picks the initiative from the seed, and the initiative player places first', () => {
    const a = newGame(1)
    const b = newGame(1)
    expect(a.initiative).toBe(b.initiative)
    expect(a.step).toEqual({ k: 'place', seat: a.initiative, from: 'support', placed: [] })
    const seeds = new Set(Array.from({ length: 20 }, (_, i) => newGame(i).initiative))
    expect(seeds.size).toBe(2)
  })

  it('places face down on empty positions only, and confirms only a full field', () => {
    let s = newGame()
    const seat = s.initiative
    expect(isLegal(s, { t: 'done' })).toBe(false)
    s = must(s, { t: 'place', card: seat ? 'c13' : 'c1', slot: 0 })
    expect(s.players[seat].field[0]).toMatchObject({ faceUp: false, state: 'ready' })
    const card = s.players[seat].support[0]
    expect(isLegal(s, { t: 'place', card, slot: 0 })).toBe(false)
    s = must(s, { t: 'unplace', slot: 0 })
    expect(s.players[seat].support).toHaveLength(12)
    s = must(s, { t: 'placeRandom' })
    expect(s.players[seat].field.every((f) => f.card)).toBe(true)
    expect(s.players[seat].support).toHaveLength(6)
    expect(isLegal(s, { t: 'placeRandom' })).toBe(false)
    s = must(s, { t: 'done' })
    expect(s.step).toMatchObject({ k: 'place', seat: other(seat) })
  })

  it('starts the Skirmish once both fields are full', () => {
    const s = placeInOrder(newGame())
    expect(s.phase).toBe('skirmish')
    expect(s.step).toEqual({ k: 'reveal', seat: s.initiative, count: 2 })
  })

  it('rejects moves that are not legal now, returning the same state', () => {
    const s = newGame()
    expect(apply(s, { t: 'pass' })).toBe(s)
    expect(apply(s, { t: 'place', card: 'nope', slot: 0 })).toBe(s)
  })
})

describe('the Skirmish', () => {
  it('reveals 2 adjacent cards each, then 1 at a time next to revealed ones, alternating', () => {
    let s = placeInOrder(newGame())
    const init = s.initiative
    const opp = other(init)
    // Not adjacent: 0 and 2.
    expect(isLegal(s, { t: 'reveal', slots: [0, 2] })).toBe(false)
    s = must(s, { t: 'reveal', slots: [1, 0] })
    expect(s.players[opp].field.filter((f) => f.faceUp)).toHaveLength(2)
    // No abilities yet, so the response is skipped.
    expect(s.step).toEqual({ k: 'reveal', seat: opp, count: 2 })
    s = must(s, { t: 'reveal', slots: [4, 5] })
    expect(s.step).toEqual({ k: 'reveal', seat: init, count: 1 })
    // Only next to a revealed card (0, 1 revealed: 2, 3, 4 are next to them; 5 isn't).
    expect(legalMoves(s).map((m) => (m.t === 'reveal' ? m.slots[0] : -1))).toEqual([2, 3, 4])
    s = must(s, { t: 'reveal', slots: [2] })
    expect(s.step).toEqual({ k: 'reveal', seat: opp, count: 1 })
    s = revealAll(s)
    expect(s.players.every((p) => p.field.every((f) => f.faceUp))).toBe(true)
    expect(s.phase).toBe('combat')
    // 2 pairs + 8 single reveals.
    expect(s.skirmish.reveals).toBe(10)
  })

  it('reveals in pairs throughout under the pairs rule', () => {
    let s = placeInOrder(
      createGame({
        cards: basicCards(),
        decks: basicDecks(),
        names: ['A', 'B'],
        seed: 7,
        reveal: 'pairs',
      }),
    )
    const init = s.initiative
    // The opening pair touches.
    expect(isLegal(s, { t: 'reveal', slots: [0, 2] })).toBe(false)
    s = must(s, { t: 'reveal', slots: [0, 1] })
    s = must(s, { t: 'reveal', slots: [4, 5] })
    // Later pairs: each card next to a revealed one (2, 3, 4), touching each other or not.
    expect(s.step).toEqual({ k: 'reveal', seat: init, count: 2 })
    expect(legalMoves(s)).toEqual([
      { t: 'reveal', slots: [2, 3] },
      { t: 'reveal', slots: [2, 4] },
      { t: 'reveal', slots: [3, 4] },
    ])
    expect(isLegal(s, { t: 'reveal', slots: [4, 5] })).toBe(false)
    s = must(s, { t: 'reveal', slots: [2, 3] })
    s = revealAll(s)
    expect(s.phase).toBe('combat')
    // 3 pairs per field, never a single.
    expect(s.skirmish.reveals).toBe(6)
  })

  it('never reveals a single under the pairs rule while 2 cards are face down', () => {
    let s = placeInOrder(
      createGame({
        cards: basicCards(),
        decks: basicDecks(),
        names: ['A', 'B'],
        seed: 7,
        reveal: 'pairs',
      }),
    )
    const opp = other(s.initiative)
    s = must(s, { t: 'reveal', slots: [1, 2] })
    s = must(s, { t: 'reveal', slots: [0, 1] })
    // Swaps left 0 and 4 face down on that field, diagonal from each other: one pair.
    s = produce(s, (d) => {
      d.players[opp].field.forEach((f, i) => (f.faceUp = i !== 0 && i !== 4))
    })
    expect(legalMoves(s)).toEqual([{ t: 'reveal', slots: [0, 4] }])
  })

  it('reveals each field in two groups of 3 under the triples rule', () => {
    let s = placeInOrder(
      createGame({
        cards: basicCards(),
        decks: basicDecks(),
        names: ['A', 'B'],
        seed: 7,
        reveal: 'triples',
      }),
    )
    const init = s.initiative
    expect(s.step).toEqual({ k: 'reveal', seat: init, count: 3 })
    // 3 connected cards: a row, or an L.
    expect(isLegal(s, { t: 'reveal', slots: [0, 1, 2] })).toBe(true)
    expect(isLegal(s, { t: 'reveal', slots: [0, 2, 4] })).toBe(false)
    // An L leaves 2, 3 and 5 on that side, which don't all touch: they are still one group.
    s = must(s, { t: 'reveal', slots: [0, 1, 4] })
    s = must(s, { t: 'reveal', slots: [3, 4, 5] })
    expect(legalMoves(s)).toEqual([{ t: 'reveal', slots: [2, 3, 5] }])
    s = revealAll(s)
    expect(s.players.every((p) => p.field.every((f) => f.faceUp))).toBe(true)
    expect(s.skirmish.reveals).toBe(4)
  })

  it('ranks Ready cards by Fate Number: the lower half attacks, the lowest is the Main Attacker', () => {
    const s = revealAll(placeInOrder(newGame()))
    for (const seat of [0, 1] as Seat[]) {
      const f = s.players[seat].field
      expect(f.map((x) => x.state)).toEqual([
        'attacking',
        'attacking',
        'attacking',
        'defending',
        'defending',
        'defending',
      ])
      expect(s.players[seat].mainAttacker).toBe(0)
    }
  })

  it('gives an odd card to the defenders and sets ability-active cards aside', () => {
    let s = placeInOrder(newGame())
    // Pretend a Field Ability made position 0 ability-active during the Skirmish.
    s = produce(s, (d) => {
      d.players[0].field[0].state = 'ability'
    })
    s = revealAll(s)
    const f = s.players[0].field
    expect(f[0].state).toBe('ability')
    // 5 Ready cards: 2 attack, 3 defend.
    expect(f.filter((x) => x.state === 'attacking')).toHaveLength(2)
    expect(f.filter((x) => x.state === 'defending')).toHaveLength(3)
    expect(s.players[0].mainAttacker).toBe(1)
  })
})

describe('Combat', () => {
  const combat = () => revealAll(placeInOrder(newGame()))

  it('lets the initiative player choose the First Engagement', () => {
    const s = combat()
    expect(s.step).toEqual({ k: 'first', seat: s.initiative })
    const t = must(s, { t: 'first', attacker: other(s.initiative) })
    expect(t.engagement?.attacker).toBe(other(s.initiative))
    expect(t.step).toEqual({ k: 'fs', seat: s.initiative })
  })

  it('counts the Main Attacker with adjacent attackers against defenders on or next to the target', () => {
    const s = combat()
    const sides = engagementSides(s, 0)!
    expect(sides).toEqual({ main: 0, target: 2, attackers: [0, 1], defenders: [5] })
    const t = must(s, { t: 'first', attacker: 0 })
    // c1 + c2 attack 4 + 4; seat 1's c18 at position 5 defends 3.
    expect(engagementTotals(t, t.engagement!)).toMatchObject({ attack: 8, defense: 3 })
  })

  it('alternates Fighting Spirit from the initiative player; a pass locks a total', () => {
    let s = must(combat(), { t: 'first', attacker: 0 })
    const init = s.initiative
    const card = s.players[init].support[0]
    s = must(s, { t: 'fs', card })
    expect(s.step).toEqual({ k: 'fs', seat: other(init) })
    expect(s.players[init].support).not.toContain(card)
    s = pass(s)
    // The other player passed: the initiative player may keep going.
    expect(s.step).toEqual({ k: 'fs', seat: init })
    const before = s.players[0].points + s.players[1].points
    s = pass(s)
    expect(s.players[0].points + s.players[1].points).toBe(before + 1)
    expect(s.results).toHaveLength(1)
    expect(s.engagement?.attacker).toBe(1)
  })

  it('scores a tie as nothing', () => {
    let s = must(combat(), { t: 'first', attacker: 0 })
    s = produce(s, (d) => {
      // Make the attack 3 + 3 = 6 and the defense 6.
      d.cards.c1 = { ...d.cards.c1, a: 3 }
      d.cards.c2 = { ...d.cards.c2, a: 3 }
      d.cards.c18 = { ...d.cards.c18, d: 6 }
      // Values lock when combat starts: lock them again with these.
      d.combat = lockCombat(d)
    })
    s = pass(pass(s))
    expect(s.results[0]).toMatchObject({ attack: 6, defense: 6, scorer: null })
    expect(s.players[0].points + s.players[1].points).toBe(0)
  })

  it('gives the point to the attacker when no defender is on or next to the target', () => {
    let s = placeInOrder(newGame())
    // Seat 1's defenders all sit far from position 2 (seat 0 attacks it).
    s = produce(s, (d) => {
      const f = d.players[1].field
      // The highest Fate Numbers (the defenders) go on 0, 3 and 4, none of them on or next to 2.
      const cards = f.map((x) => x.card!)
      const byFate = [...cards].sort((a, b) => d.cards[a].fate - d.cards[b].fate)
      const order = [byFate[3], byFate[0], byFate[1], byFate[4], byFate[5], byFate[2]]
      order.forEach((c, i) => (f[i].card = c))
    })
    s = revealAll(s)
    expect(engagementSides(s, 0)!.defenders).toEqual([])
    s = must(s, { t: 'first', attacker: 0 })
    expect(s.results[0]).toMatchObject({ attacker: 0, scorer: 0, note: 'no-defenders' })
    expect(s.players[0].points).toBe(1)
    expect(s.engagement?.attacker).toBe(1)
  })

  it('flags a player left without an attacker and plays only the other Engagement', () => {
    let s = placeInOrder(newGame())
    s = produce(s, (d) => {
      // Only one Ready card left (on 2, which seat 0 attacks): it defends, so there is no attacker.
      for (const i of [0, 1, 3, 4, 5]) d.players[1].field[i].state = 'ability'
    })
    s = revealAll(s)
    expect(s.players[1].mainAttacker).toBeNull()
    expect(s.results[0]).toMatchObject({ attacker: 1, scorer: null, note: 'no-attacker' })
    expect(s.log.some((l) => l.flag)).toBe(true)
    // No choice of First Engagement: only seat 0 attacks.
    expect(s.step.k).toBe('fs')
    expect(s.engagement?.attacker).toBe(0)
  })

  it('passes for a player with no Support left', () => {
    let s = must(combat(), { t: 'first', attacker: 0 })
    s = produce(s, (d) => {
      d.players[other(d.initiative)].support = []
    })
    const init = s.initiative
    s = must(s, { t: 'fs', card: s.players[init].support[0] })
    expect(s.step).toEqual({ k: 'fs', seat: init })
    expect(s.engagement!.passed[other(init)]).toBe(true)
  })
})

describe('Regroup', () => {
  it('rests spent and unused Support, moves active cards to Support and refills from the rest zone', () => {
    let s = must(revealAll(placeInOrder(newGame())), { t: 'first', attacker: 0 })
    const init = s.initiative
    s = must(s, { t: 'fs', card: s.players[init].support[0] })
    while (s.step.k === 'fs') s = pass(s)
    expect(s.phase).toBe('regroup')
    for (const seat of [0, 1] as Seat[]) {
      const p = s.players[seat]
      expect(p.rest).toHaveLength(6)
      expect(p.support).toHaveLength(6)
      expect(p.field.every((f) => !f.card)).toBe(true)
      expect(p.mainAttacker).toBeNull()
    }
    expect(s.step).toEqual({ k: 'place', seat: init, from: 'rest', placed: [] })
    const fieldBefore = s.players[init].support
    s = placeInOrder(s)
    expect(s.initiative).toBe(other(init))
    expect(s.round).toBe(2)
    expect(s.phase).toBe('skirmish')
    expect(s.players[init].field.every((f) => f.card && !f.faceUp)).toBe(true)
    // Last round's field is now the Support.
    expect(s.players[init].support).toEqual(fieldBefore)
    expect(s.players[init].rest).toEqual([])
  })
})

/** Plays a whole game: always pass Fighting Spirit except the first card, first legal choice otherwise. */
function playOut(seed: number): { state: AsState; moves: Move[] } {
  let s = newGame(seed)
  const moves: Move[] = []
  for (let n = 0; n < 2000 && s.step.k !== 'over'; n++) {
    const legal = legalMoves(s)
    const m =
      s.step.k === 'place'
        ? (legal.find((x) => x.t === 'placeRandom') ?? legal.find((x) => x.t === 'done')!)
        : s.step.k === 'fs' && s.engagement!.fs[s.step.seat].length === 0
          ? legal[0]
          : s.step.k === 'fs'
            ? { t: 'pass' as const }
            : legal[0]
    moves.push(m)
    s = must(s, m)
  }
  return { state: s, moves }
}

describe('whole games', () => {
  it('ends with a winner at 4 points', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { state } = playOut(seed)
      expect(state.step.k).toBe('over')
      expect(state.winner).not.toBeNull()
      expect(state.players[state.winner!.seat].points).toBe(4)
      expect(actor(state)).toBeNull()
      // Every card is somewhere, once.
      for (const p of state.players) {
        const all = [
          ...p.field.flatMap((f) => (f.card ? [f.card] : [])),
          ...p.support,
          ...p.rest,
          ...p.spent,
        ]
        expect(new Set(all).size).toBe(12)
        expect(all).toHaveLength(12)
      }
    }
  })

  it('replays the same game from the same seed and moves', () => {
    const { state, moves } = playOut(42)
    let s = newGame(42)
    for (const m of moves) s = apply(s, m)
    expect(s).toEqual(state)
  })
})

describe("a player's view", () => {
  it("hides the opponent's face-down cards, their Support and the seed", () => {
    const s = must(placeInOrder(newGame()), { t: 'reveal', slots: [0, 1] })
    const opp = other(s.initiative)
    const v = observeAs(s, s.initiative)
    expect(v.seed).toBe(0)
    expect(v.players[opp].support.every((c) => c === HIDDEN)).toBe(true)
    expect(v.players[opp].field.map((f) => f.card === HIDDEN)).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
    ])
    // Your own cards stay known.
    expect(v.players[s.initiative].support).toEqual(s.players[s.initiative].support)
  })
})

/**
 * Scripted games saved as JSON (deck, seed, moves, outcome), so a port of the
 * rules (the Godot game) can replay them and prove it plays the same.
 * AS_WRITE_FIXTURES=1 npx vitest run src/adventure writes them again.
 */
const FIXTURES = 'src/adventure/fixtures/games'
interface GameFixture {
  format: 'adventure-scuffle-game'
  cards: 'basic'
  names: [string, string]
  decks: [string[], string[]]
  seed: number
  moves: Move[]
  expect: { winner: Seat; points: [number, number]; round: number; log: string[] }
}

describe('saved scripted games', () => {
  if (process.env.AS_WRITE_FIXTURES) {
    it('writes the fixtures', () => {
      mkdirSync(FIXTURES, { recursive: true })
      for (const seed of [42, 1234]) {
        const { state, moves } = playOut(seed)
        const fx: GameFixture = {
          format: 'adventure-scuffle-game',
          cards: 'basic',
          names: ['Ann', 'Bo'],
          decks: basicDecks(),
          seed,
          moves,
          expect: {
            winner: state.winner!.seat,
            points: [state.players[0].points, state.players[1].points],
            round: state.round,
            log: state.log.map((l) => l.text),
          },
        }
        writeFileSync(`${FIXTURES}/basic-seed-${seed}.json`, JSON.stringify(fx, null, 1) + '\n')
      }
    })
  }

  const files = existsSync(FIXTURES) ? readdirSync(FIXTURES).filter((f) => f.endsWith('.json')) : []
  if (!process.env.AS_WRITE_FIXTURES)
    it('has fixtures', () => expect(files.length).toBeGreaterThan(0))
  for (const file of files)
    it(`replays ${file}`, () => {
      const fx = JSON.parse(readFileSync(`${FIXTURES}/${file}`, 'utf8')) as GameFixture
      let s = createGame({ cards: basicCards(), decks: fx.decks, names: fx.names, seed: fx.seed })
      for (const m of fx.moves) s = must(s, m)
      expect(s.winner?.seat).toBe(fx.expect.winner)
      expect([s.players[0].points, s.players[1].points]).toEqual(fx.expect.points)
      expect(s.round).toBe(fx.expect.round)
      expect(s.log.map((l) => l.text)).toEqual(fx.expect.log)
    })
})
