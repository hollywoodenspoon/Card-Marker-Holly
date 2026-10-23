import { describe, expect, it } from 'vitest'
import {
  apply,
  applyFast,
  createGame,
  isLegal,
  legalMoves,
  playInPlace,
  searchCopy,
} from '../engine'
import { FIRST_QUEST, TEST_DECKS } from '../fixtures/firstQuest'
import type { AsState } from '../state'
import { mctsMove } from './mcts'
import { quickMove } from './policies'

const decks = Object.values(TEST_DECKS)
const noLog = ({ log: _log, ...rest }: AsState) => rest

describe('the search fast paths', () => {
  it('applyFast and playInPlace play the same game as apply, without log lines', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createGame({
        cards: FIRST_QUEST,
        decks: [decks[seed % 4], decks[(seed >> 2) % 4]],
        names: ['A', 'B'],
        seed,
      })
      const r = { seed: seed * 31 }
      for (let n = 0; n < 3000 && s.step.k !== 'over'; n++) {
        const legal = legalMoves(s).filter((m) => m.t !== 'unplace')
        const m = legal[n % legal.length]
        const slow = apply(s, m)
        const fast = applyFast(s, m)
        const copy = searchCopy(s)
        playInPlace(copy, m)
        expect(noLog(fast)).toEqual(noLog(slow))
        expect(noLog(copy)).toEqual(noLog(slow))
        expect(fast.log).toBe(s.log)
        s = n % 3 ? slow : apply(s, quickMove(s, r))
      }
    }
  }, 60_000)

  it('a search copy never changes the game it was copied from', () => {
    const s = createGame({
      cards: FIRST_QUEST,
      decks: [decks[0], decks[1]],
      names: ['A', 'B'],
      seed: 4,
    })
    const before = structuredClone(s)
    const copy = searchCopy(s)
    const r = { seed: 9 }
    for (let n = 0; n < 200 && copy.step.k !== 'over'; n++)
      playInPlace(copy, quickMove(copy, r, true))
    expect(s).toEqual(before)
  })
})

describe('MCTS (Hard)', () => {
  it('plays a legal move, the same one for the same seed and budget', () => {
    let s = createGame({
      cards: FIRST_QUEST,
      decks: [decks[2], decks[3]],
      names: ['A', 'B'],
      seed: 11,
    })
    const r = { seed: 5 }
    let searched = 0
    for (let n = 0; n < 3000 && s.step.k !== 'over'; n++) {
      if (n % 4 === 0 && s.step.k !== 'rps') {
        const seat = s.step.seat
        const m = mctsMove(s, seat, { seed: n }, { iterations: 40 })
        expect(isLegal(s, m), JSON.stringify(m)).toBe(true)
        expect(mctsMove(s, seat, { seed: n }, { iterations: 40 })).toEqual(m)
        searched++
      }
      s = apply(s, quickMove(s, r))
    }
    expect(searched).toBeGreaterThan(10)
  }, 60_000)

  it('stops near its thinking time', () => {
    const s = createGame({
      cards: FIRST_QUEST,
      decks: [decks[0], decks[1]],
      names: ['A', 'B'],
      seed: 2,
    })
    // Find a decision with more than one move.
    let x = s
    const r = { seed: 3 }
    while (legalMoves(x).filter((m) => m.t !== 'unplace').length < 2) x = apply(x, quickMove(x, r))
    const t = Date.now()
    mctsMove(
      x,
      x.step.k === 'over' ? 0 : x.step.seat,
      { seed: 1 },
      { thinkMs: 150, iterations: 1e6 },
    )
    expect(Date.now() - t).toBeLessThan(1500)
  })
})
