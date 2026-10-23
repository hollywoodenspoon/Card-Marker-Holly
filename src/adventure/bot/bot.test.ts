import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { shuffle } from '@/playtest/rng'
import { apply, createGame, isLegal } from '../engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS, TEST_DECKS } from '../fixtures/firstQuest'
import { report, simulate } from '../sim/sim'
import { other, type AsState } from '../state'
import { determinize } from './determinize'
import { botMove, type BotLevel } from '.'

const decks = Object.values(TEST_DECKS)

/** A whole bot game; every move must be legal. */
function play(a: BotLevel, b: BotLevel, seed: number, playouts = 16, iterations = 60) {
  let s = createGame({
    cards: FIRST_QUEST,
    decks: [decks[seed % 4], decks[(seed >> 2) % 4]],
    names: ['A', 'B'],
    seed,
  })
  const states: AsState[] = []
  for (let n = 0; n < 3000 && s.step.k !== 'over'; n++) {
    const level = s.step.seat === 0 ? a : b
    const m = botMove(s, level, seed * 7919 + n, { playouts, iterations })
    expect(isLegal(s, m), `${level}: ${JSON.stringify(m)} at ${JSON.stringify(s.step)}`).toBe(true)
    states.push(s)
    s = apply(s, m)
  }
  return { s, states }
}

describe('bots', () => {
  it('every level only plays legal moves and finishes its games', () => {
    for (let seed = 1; seed <= 8; seed++) {
      expect(play('easy', 'normal', seed).s.winner).not.toBeNull()
      expect(play('normal', 'normal', seed + 100).s.winner).not.toBeNull()
    }
    for (let seed = 1; seed <= 3; seed++)
      expect(play('hard', seed % 2 ? 'easy' : 'hard', seed + 200, 16, 30).s.winner).not.toBeNull()
  }, 120_000)

  /** Wins of `strong` against `weak` over `games` seeded games, swapping seats. */
  function wins(
    strong: BotLevel,
    weak: BotLevel,
    games: number,
    playouts?: number,
    iterations?: number,
  ) {
    let n = 0
    for (let seed = 1; seed <= games; seed++) {
      // Seats swap, so neither side is helped by going first.
      const seat = seed % 2
      const { s } = play(
        seat === 0 ? strong : weak,
        seat === 0 ? weak : strong,
        seed,
        playouts,
        iterations,
      )
      if (s.winner?.seat === seat) n++
    }
    return n
  }

  it('Normal beats Easy more often than not', () => {
    // 28 of 30 when this was written.
    expect(wins('normal', 'easy', 30)).toBeGreaterThanOrEqual(20)
  }, 120_000)

  it('Hard beats Easy most of the time', () => {
    // 6 of 6 when this was written, at 100 iterations a decision.
    expect(wins('hard', 'easy', 6, 16, 100)).toBeGreaterThanOrEqual(5)
  }, 120_000)

  it("doesn't peek: the opponent's hidden cards can be anywhere, the move is the same", () => {
    const { states } = play('normal', 'normal', 7)
    let checked = 0
    for (const [i, s] of states.entries()) {
      if (s.step.k === 'over' || s.step.k === 'choose') continue
      const seat = s.step.seat
      // Shuffle the opponent's hidden cards in a way the bot can't know.
      const moved = produce(s, (d) => {
        const p = d.players[other(seat)]
        const [mixed] = shuffle(p.support, i + 1)
        p.support = mixed
      })
      for (const level of ['easy', 'normal', 'hard'] as const)
        expect(
          botMove(moved, level, 99 + i, { playouts: 8, iterations: 20 }),
          `${level} at ${JSON.stringify(s.step)}`,
        ).toEqual(botMove(s, level, 99 + i, { playouts: 8, iterations: 20 }))
      checked++
    }
    expect(checked).toBeGreaterThan(50)
  }, 120_000)

  it("determinizes only the opponent's hidden cards", () => {
    const { states } = play('normal', 'normal', 3)
    const s = states.find((x) => x.phase === 'combat')!
    const seat = s.step.k === 'over' ? 0 : s.step.seat
    const g = determinize(s, seat, 5)
    expect(g.players[seat]).toEqual(s.players[seat])
    const opp = other(seat)
    const hidden = (x: AsState) =>
      [
        ...x.players[opp].support,
        ...x.players[opp].field.filter((f) => f.card && !f.faceUp).map((f) => f.card),
      ].sort()
    expect(hidden(g)).toEqual(hidden(s))
    expect(g.players[opp].field.filter((f) => f.faceUp)).toEqual(
      s.players[opp].field.filter((f) => f.faceUp),
    )
  })
})

describe('balance runs', () => {
  // 16 Normal-bot games: a second or two here, but slower on a Windows CI runner.
  it(
    'play bot games and report per deck, deck against deck and per card',
    { timeout: 60_000 },
    () => {
      const r = simulate({
        cards: FIRST_QUEST,
        decks: FIRST_QUEST_DECKS,
        games: 16,
        levels: ['normal', 'easy'],
        playouts: 8,
        seed: 3,
      })
      expect(r.played).toBe(16)
      expect(r.unfinished).toBe(0)
      expect(r.problems).toEqual([])
      const wins = Object.values(r.decks).reduce((n, [, w]) => n + w, 0)
      expect(wins).toBe(16)
      expect(r.levels.Normal[0] + r.levels.Easy[0]).toBe(32)
      const md = report(r)
      for (const h of [
        '# Adventure Scuffle balance run',
        '## Decks',
        '## Deck against deck',
        '## Bot levels',
        '## Cards',
      ])
        expect(md).toContain(h)
      expect(md).toContain('| Crimson Duelist |')
    },
  )
})
