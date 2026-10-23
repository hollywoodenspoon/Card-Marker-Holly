import { describe, expect, it } from 'vitest'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '../fixtures/firstQuest'
import {
  analyzeLadder,
  fitRatings,
  ladderGames,
  ladderReport,
  playLadderSlice,
  runLadder,
  type LadderOptions,
} from './ladder'

const input = {
  packName: 'First Quest',
  cards: FIRST_QUEST,
  premades: Object.entries(FIRST_QUEST_DECKS).map(([name, cards]) => ({ name, cards })),
}

describe('the bot ladder', () => {
  it('fits ratings that match the win rates', () => {
    // Expected wins from known Elo ratings 1000, 1200, 800, 1000 games a pairing.
    const elo = [1000, 1200, 800]
    const p = (a: number, b: number) => 1 / (1 + 10 ** ((elo[b] - elo[a]) / 400))
    const wins = elo.map((_, i) => elo.map((_, j) => (i === j ? 0 : 1000 * p(i, j))))
    const fit = fitRatings(3, wins, 0)
    for (const [i, e] of elo.entries()) expect(Math.abs(fit[i] - e)).toBeLessThanOrEqual(1)
  })

  it('gives a bot that never won a finite rating below the others', () => {
    const fit = fitRatings(
      2,
      [
        [0, 0],
        [10, 0],
      ],
      0,
    )
    expect(fit[0]).toBe(1000)
    expect(Number.isFinite(fit[1])).toBe(true)
    expect(fit[1]).toBeGreaterThan(1200)
  })

  it('plays every pairing with seats swapped', () => {
    const o: LadderOptions = { entrants: [], games: 4, seed: 1 }
    const games = ladderGames(3, 5, o)
    expect(games).toHaveLength(12)
    for (const [a, b] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      const pair = games.filter((g) => g.e.includes(a) && g.e.includes(b))
      expect(pair.filter((g) => g.e[0] === a)).toHaveLength(2)
      expect(pair.filter((g) => g.e[0] === b)).toHaveLength(2)
    }
  })

  it('runs a small ladder: games add up and the checker passes', async () => {
    const options: LadderOptions = { entrants: ['quick', 'easy'], games: 16, seed: 7 }
    const r = await runLadder(
      input,
      options,
      async (slices) => slices.map(playLadderSlice),
      () => false,
    )
    expect(r.stopped).toBe(false)
    expect(r.problems).toEqual([])
    expect(r.checked).toBeGreaterThan(0)
    expect(r.rows.map((x) => x.games)).toEqual([16, 16])
    const [quick, easy] = r.rows
    expect(easy.elo).toBe(1000)
    expect(quick.wins + easy.wins + r.draws).toBe(16)
    const md = ladderReport(r)
    expect(md).toContain('# Bot ladder: First Quest')
    expect(md).toContain('| Easy (Tricks) |')
  }, 60_000)

  it('keeps what was played when stopped', async () => {
    const options: LadderOptions = {
      entrants: ['quick', 'easy'],
      games: 8,
      seed: 3,
      reveal: 'pairs',
    }
    const r = await runLadder(
      input,
      options,
      async (slices) => slices.map((s, i) => (i === 0 ? playLadderSlice(s) : undefined)),
      () => true,
    )
    expect(r.stopped).toBe(true)
    expect(r.rows[0].games).toBe(4)
    expect(
      analyzeLadder(input, options, [], [], { startedAt: 0, seconds: 0, stopped: true }).rows,
    ).toEqual([])
  }, 60_000)
})
