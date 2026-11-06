import { describe, expect, it } from 'vitest'
import { botMove } from './bot'
import { deal } from './cards'
import { apply, createGame } from './engine'
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
