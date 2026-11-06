import { describe, expect, it } from 'vitest'
import { botMove, isBlunder } from './bot'
import { deal } from './cards'
import { apply, createGame, legalMoves } from './engine'
import { replayStates } from './replay'
import { rng, simulate } from './sim'
import type { Kind, UwMove } from './state'

const FP: Record<Kind, number> = { flag: 2, nil: 3, support: 1, bomb: 0 }
const pool = (['flag', 'nil', 'support', 'bomb'] as Kind[]).map((k) => ({
  packId: k,
  name: k,
  kind: k,
  fp: FP[k],
}))

describe('simulation', () => {
  it('counts every game and repeats with the same seed', () => {
    const a = simulate(pool, ['easy', 'easy'], 40, 7)
    expect(a.games).toBe(40)
    expect(a.wins[0] + a.wins[1] + a.draws).toBe(40)
    expect(simulate(pool, ['easy', 'easy'], 40, 7)).toEqual(a)
  })
})

describe('replay', () => {
  it('rebuilds the same end state from the start and moves', () => {
    const rand = rng(3)
    const start = createGame(deal(pool), 0)
    let s = start
    const moves: UwMove[] = []
    for (let i = 0; i < 200 && s.winner === null; i++) {
      const m = botMove(s, 'easy', rand)
      moves.push(m)
      s = apply(s, m)
    }
    const states = replayStates({ start, moves })
    expect(states).toHaveLength(moves.length + 1)
    expect(states[states.length - 1]).toEqual(s)
  })
})

describe('trial rules', () => {
  const g = (rules = {}) => createGame(deal(pool), 0, rules)
  it('noFirstPush and notBesideCenter limit the first turn', () => {
    const s = g({ noFirstPush: true })
    expect(legalMoves(s).some((m) => m.type === 'place' && m.dir)).toBe(false)
    let t = g({ notBesideCenter: true })
    t = apply(
      t,
      legalMoves(t).find((m) => m.type === 'place')!,
    )
    while (t.turn === 0) t = apply(t, legalMoves(t)[0])
    expect(legalMoves(t).some((m) => m.type === 'place' && m.zone % 2 === 1)).toBe(false)
  })
  it('oneEach ends the first turn after one card', () => {
    const s = g({ oneEach: true })
    const t = apply(
      s,
      legalMoves(s).find((m) => m.type === 'place')!,
    )
    expect(t.turn).toBe(1)
  })
  it('every switch still finishes bot games', () => {
    const all = {
      oneEach: true,
      noFirstPush: true,
      notBesideCenter: true,
    }
    expect(simulate(pool, ['normal', 'easy'], 6, 2, all).games).toBe(6)
  })
  it('the bot does not move a card off the field', () => {
    const rand = rng(5)
    let s = g()
    for (let i = 0; i < 60 && s.winner === null; i++) {
      const m = botMove(s, 'normal', rand)
      const next = apply(s, m)
      if (next.winner !== s.turn)
        expect(isBlunder(s, m) && legalMoves(s).some((x) => !isBlunder(s, x))).toBe(false)
      s = next
    }
  })
})
