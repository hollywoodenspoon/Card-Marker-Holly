import { describe, expect, it } from 'vitest'
import { botMove } from './bot'
import { apply, createGame, legalMoves, type NewGame } from './engine'
import { basicCards, basicDecks } from './fixtures/basic'
import { observeAs } from './observe'

const game = (extra: Partial<NewGame> = {}): NewGame => ({
  cards: basicCards(),
  decks: basicDecks(),
  names: ['Ann', 'Bo'],
  seed: 5,
  ...extra,
})

describe('the opening', () => {
  it('flips a coin by default, as before', () => {
    const s = createGame(game())
    expect(s.step.k).toBe('place')
    expect(s.rps).toBeUndefined()
    expect(createGame(game({ opening: 'coin' }))).toEqual(s)
  })

  it('uses a fixed initiative when given one', () => {
    for (const seat of [0, 1] as const) {
      const s = createGame(game({ initiative: seat, opening: 'rps' }))
      expect(s.initiative).toBe(seat)
      expect(s.step).toEqual({ k: 'place', seat, from: 'support', placed: [] })
    }
  })

  it('plays rock-paper-scissors: a tie throws again, the winner takes or gives', () => {
    let s = createGame(game({ opening: 'rps' }))
    expect(s.step).toEqual({ k: 'rps', seat: 0 })
    expect(legalMoves(s)).toHaveLength(3)
    s = apply(s, { t: 'throw', hand: 'rock' })
    expect(s.step).toEqual({ k: 'rps', seat: 1 })
    s = apply(s, { t: 'throw', hand: 'rock' })
    expect(s.step).toEqual({ k: 'rps', seat: 0 })
    expect(s.log.at(-1)!.text).toMatch(/a tie, throw again/)
    s = apply(s, { t: 'throw', hand: 'scissors' })
    s = apply(s, { t: 'throw', hand: 'rock' })
    expect(s.step).toEqual({ k: 'initiative', seat: 1 })
    expect(s.log.at(-1)!.text).toMatch(/Bo wins \(rock beats scissors\)/)
    const gave = apply(s, { t: 'initiative', take: false })
    expect(gave.initiative).toBe(0)
    expect(gave.step).toMatchObject({ k: 'place', seat: 0, from: 'support' })
    expect(apply(s, { t: 'initiative', take: true }).initiative).toBe(1)
  })

  it('hides the first throw from the second player until both have thrown', () => {
    const s = apply(createGame(game({ opening: 'rps' })), { t: 'throw', hand: 'paper' })
    expect(observeAs(s, 1).rps).toEqual([null, null])
    expect(observeAs(s, 0).rps).toEqual(['paper', null])
  })

  it('bots get through it and the winner takes the initiative', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      let s = createGame(game({ opening: 'rps', seed: 11 }))
      for (let n = 0; n < 40 && (s.step.k === 'rps' || s.step.k === 'initiative'); n++) {
        const seat = s.step.seat
        const m = botMove(observeAs(s, seat), level, n + 1)
        if (m.t === 'initiative') expect(m.take).toBe(true)
        s = apply(s, m)
      }
      expect(s.step.k).toBe('place')
    }
  })
})
