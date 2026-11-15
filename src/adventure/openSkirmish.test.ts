import { describe, expect, it } from 'vitest'
import { apply, createGame, legalMoves, type Move } from './engine'
import { FIRST_QUEST, TEST_DECKS } from './fixtures/firstQuest'
import { randomGame } from './fixtures/randomGame'
import type { AsState } from './state'
import { botMove } from './bot'

const decks = Object.values(TEST_DECKS)

/** Play the setup (random fill, done) for both players. */
function setUp(seed: number): AsState {
  let s = createGame({
    cards: FIRST_QUEST,
    decks: [decks[0], decks[1]],
    names: ['A', 'B'],
    seed,
    mode: 'open',
  })
  for (let i = 0; i < 4 && s.step.k === 'place'; i++)
    s = apply(s, legalMoves(s).find((m) => m.t === 'placeRandom') ?? { t: 'done' })
  return s
}

describe('Open Skirmish', () => {
  it('reveals every field card at the start, then Flip picks alternate', () => {
    let s = setUp(7)
    expect(s.players.every((p) => p.field.every((f) => f.faceUp))).toBe(true)
    let last = -1
    while (s.step.k === 'flip' || s.step.k === 'choose') {
      const st = s.step
      if (st.k === 'flip') {
        const mine = s.flips.filter((f) => f.owner === st.seat).length
        const theirs = s.flips.length - mine
        // The same player twice only when the other has none left.
        if (st.seat === last) expect(theirs).toBe(0)
        last = st.seat
      }
      s = apply(s, legalMoves(s)[0])
    }
    expect(s.step.k).toBe('act')
  })

  it('caps Attack and Defense at 3 and makes the last attacker the Main Attacker', () => {
    let s = setUp(11)
    while (s.step.k !== 'act') s = apply(s, legalMoves(s)[0])
    const seat = s.step.seat
    const turned: number[] = []
    for (let i = 0; i < 6 && s.step.k === 'act'; i++) {
      if (s.step.seat !== seat) {
        s = apply(s, { t: 'pass' })
        continue
      }
      const atk = legalMoves(s).find((m): m is Extract<Move, { t: 'attack' }> => m.t === 'attack')
      if (!atk) break
      s = apply(s, atk)
      turned.push(atk.slot)
    }
    const p = s.players[seat]
    expect(p.field.filter((f) => f.state === 'attacking').length).toBeLessThanOrEqual(3)
    if (turned.length) expect(p.mainAttacker).toBe(turned[turned.length - 1])
  })

  it('plays random games to the end', () => {
    for (let n = 0; n < 60; n++) {
      const { s } = randomGame(
        decks[n % decks.length],
        decks[(n + 1) % decks.length],
        n * 17 + 3,
        undefined,
        'open',
      )
      expect(s.step.k, `game ${n}`).toBe('over')
      expect(s.mode).toBe('open')
    }
  }, 60_000)

  it('Normal bot beats Easy and builds attack chains', () => {
    let wins = 0
    let chains = 0
    const N = 6
    for (let n = 0; n < N; n++) {
      let s = setUp(n * 31 + 7)
      for (let k = 0; k < 4000 && s.step.k !== 'over'; k++) {
        const seat = s.step.seat
        if (s.step.k === 'act' && seat === 0 && s.players[0].field.filter((f) => f.state === 'attacking').length >= 2)
          chains++
        s = apply(s, botMove(s, seat === 0 ? 'normal' : 'easy', n * 1000 + k))
      }
      if (s.winner?.seat === 0) wins++
    }
    expect(wins).toBeGreaterThanOrEqual(N * 0.6)
    expect(chains).toBeGreaterThan(0)
  }, 120_000)
})
