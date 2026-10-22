import { describe, expect, it } from 'vitest'
import { apply, createGame } from '../engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '../fixtures/firstQuest'
import { rushGame, type RushJob } from './rush'

const [guild, retinue] = Object.values(FIRST_QUEST_DECKS)
const job: RushJob = {
  cards: FIRST_QUEST,
  decks: [guild, retinue],
  names: ['Guild', 'Retinue'],
  levels: ['normal', 'easy'],
  seed: 4,
}

describe('rushGame', () => {
  it('swaps seats every other game, keeping each deck its level', () => {
    const a = rushGame(job, 0)
    const b = rushGame(job, 1)
    expect(a.seats).toEqual([0, 1])
    expect(a.levels).toEqual(['normal', 'easy'])
    expect(b.seats).toEqual([1, 0])
    expect(b.levels).toEqual(['easy', 'normal'])
  }, 60_000)

  it('is the same game wherever it is played, and replays from its moves', () => {
    const a = rushGame(job, 2)
    expect(rushGame(job, 2).match.moves).toEqual(a.match.moves)
    const start = createGame({
      cards: FIRST_QUEST,
      decks: [guild, retinue],
      names: ['Guild', 'Retinue'],
      seed: a.seed,
    })
    expect(a.match.moves.reduce(apply, start)).toEqual(a.match.state)
    const fs = a.match.moves.filter((m) => m.t === 'fs').length
    expect(Object.values(a.uses).reduce((n, v) => n + v[0], 0)).toBe(fs)
  }, 60_000)
})
