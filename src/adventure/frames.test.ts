import { describe, expect, it } from 'vitest'
import { nextInt } from '@/playtest/rng'
import { apply, applyFrames, createGame, legalMoves } from './engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from './fixtures/firstQuest'
import { playMatch } from './sim/sim'

const [guild, retinue] = Object.values(FIRST_QUEST_DECKS)

describe('applyFrames', () => {
  it('gives one frame per new log line, ending on the state apply gives', () => {
    for (const seed of [1, 2, 3]) {
      let s = createGame({ cards: FIRST_QUEST, decks: [guild, retinue], names: ['A', 'B'], seed })
      let r = seed
      for (let n = 0; n < 3000 && s.step.k !== 'over'; n++) {
        const legal = legalMoves(s).filter((m) => m.t !== 'unplace')
        let i: number
        ;[i, r] = nextInt(r, legal.length)
        const frames = applyFrames(s, legal[i])
        const next = apply(s, legal[i])
        expect(frames.at(-1)).toEqual(next)
        const added = next.log.length - s.log.length
        expect(frames.length).toBe(Math.max(1, added))
        frames.forEach((f, k) => {
          if (added) expect(f.log.length).toBe(s.log.length + k + 1)
        })
        s = next
      }
      expect(s.step.k).toBe('over')
    }
  })

  it('gives nothing for an illegal move', () => {
    const s = createGame({
      cards: FIRST_QUEST,
      decks: [guild, retinue],
      names: ['A', 'B'],
      seed: 1,
    })
    expect(applyFrames(s, { t: 'pass' })).toEqual([])
  })
})

describe('playMatch', () => {
  it('records moves that replay to the same game', () => {
    const game = {
      cards: FIRST_QUEST,
      decks: [guild, retinue] as [string[], string[]],
      names: ['A', 'B'] as [string, string],
      seed: 9,
    }
    const m = playMatch(game, ['normal', 'easy'])
    expect(m.problem).toBeUndefined()
    expect(m.state.step.k).toBe('over')
    expect(m.moves.reduce(apply, createGame(game))).toEqual(m.state)
  }, 60_000)
})
