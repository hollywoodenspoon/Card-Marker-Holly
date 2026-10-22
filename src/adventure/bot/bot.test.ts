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
function play(a: BotLevel, b: BotLevel, seed: number, playouts = 16) {
  let s = createGame({
    cards: FIRST_QUEST,
    decks: [decks[seed % 4], decks[(seed >> 2) % 4]],
    names: ['A', 'B'],
    seed,
  })
  const states: AsState[] = []
  for (let n = 0; n < 3000 && s.step.k !== 'over'; n++) {
    const level = s.step.seat === 0 ? a : b
    const m = botMove(s, level, seed * 7919 + n, { playouts })
    expect(isLegal(s, m), `${level}: ${JSON.stringify(m)} at ${JSON.stringify(s.step)}`).toBe(true)
    states.push(s)
    s = apply(s, m)
  }
  return { s, states }
}

describe('bots', () => {
  it('Easy and Normal only play legal moves and finish their games', () => {
    for (let seed = 1; seed <= 16; seed++) {
      expect(play('easy', 'normal', seed).s.winner).not.toBeNull()
      expect(play('normal', 'normal', seed + 100).s.winner).not.toBeNull()
    }
  }, 60_000)

  it('Normal beats Easy most of the time', () => {
    let wins = 0
    for (let seed = 1; seed <= 30; seed++) {
      // Seats swap, so neither side is helped by going first.
      const normalSeat = seed % 2
      const { s } = play(
        normalSeat === 0 ? 'normal' : 'easy',
        normalSeat === 0 ? 'easy' : 'normal',
        seed,
      )
      if (s.winner?.seat === normalSeat) wins++
    }
    expect(wins).toBeGreaterThanOrEqual(24)
  }, 60_000)

  it('Hard beats Easy most of the time', () => {
    let wins = 0
    for (let seed = 1; seed <= 4; seed++) {
      const hardSeat = seed % 2
      const { s } = play(
        hardSeat === 0 ? 'hard' : 'easy',
        hardSeat === 0 ? 'easy' : 'hard',
        seed,
        12,
      )
      if (s.winner?.seat === hardSeat) wins++
    }
    expect(wins).toBeGreaterThanOrEqual(3)
  }, 60_000)

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
      for (const level of ['easy', 'normal'] as const)
        expect(botMove(moved, level, 99 + i), `${level} at ${JSON.stringify(s.step)}`).toEqual(
          botMove(s, level, 99 + i),
        )
      checked++
    }
    expect(checked).toBeGreaterThan(50)
  })

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
