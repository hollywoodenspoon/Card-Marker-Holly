import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { quickMove } from './bot/policies'
import { checkGame } from './check'
import { randomDeck } from './deckgen/values'
import { apply, createGame, type Move, type NewGame } from './engine'
import { ARCHIVE_SETS } from './fixtures/archiveSets'
import { FIRST_QUEST } from './fixtures/firstQuest'

/** A First Quest game between two quick bots, as its start and moves. */
function botGame(seed: number, cards = FIRST_QUEST): { game: NewGame; moves: Move[] } {
  const [a, s1] = randomDeck(cards, seed * 2 + 1)
  const [b] = randomDeck(cards, s1)
  const game: NewGame = { cards, decks: [a, b], names: ['A', 'B'], seed }
  let s = createGame(game)
  const r = { seed: seed ^ 0x9e3779b9 }
  const moves: Move[] = []
  for (let n = 0; n < 4000 && s.step.k !== 'over'; n++) {
    const m = quickMove(s, r)
    const next = apply(s, m)
    if (next === s) break
    moves.push(m)
    s = next
  }
  return { game, moves }
}

describe('the game checker', () => {
  it('finds no rule problems in 200 First Quest bot games', { timeout: 60_000 }, () => {
    let fromSupport = 0
    for (let seed = 1; seed <= 200; seed++) {
      const { game, moves } = botGame(seed)
      const { problems, final } = checkGame(game, moves)
      expect(problems, `seed ${seed}`).toEqual([])
      expect(final.step.k, `seed ${seed}`).toBe('over')
      if (final.log.some((l) => l.text.includes('filled from Support'))) fromSupport++
    }
    // Runaway Familiar stays in Support at Regroup often enough that some
    // games refill a position from Support (and still start each round with 6).
    expect(fromSupport).toBeGreaterThan(0)
  })

  it('finds no rule problems in 200 games with the archive sets', { timeout: 60_000 }, () => {
    const pool = [...FIRST_QUEST, ...ARCHIVE_SETS]
    const seen = {
      'Final Blow:': 0,
      "can't attack, defend or use abilities": 0,
      'in the rest zone:': 0,
    }
    for (let seed = 1; seed <= 200; seed++) {
      const { game, moves } = botGame(seed, pool)
      const { problems, final } = checkGame(game, moves)
      expect(problems, `seed ${seed}`).toEqual([])
      expect(final.step.k, `seed ${seed}`).toBe('over')
      for (const k of Object.keys(seen) as (keyof typeof seen)[])
        if (final.log.some((l) => l.text.includes(k))) seen[k]++
    }
    // Final Blow, Unmade Wretch's lock and the Rest Zone Lockouts all come up.
    for (const n of Object.values(seen)) expect(n).toBeGreaterThan(0)
  })

  it('reports a move that is not legal', () => {
    const { game, moves } = botGame(3)
    const bad: Move[] = [...moves.slice(0, 5), { t: 'place', card: 'nope', slot: 0 }]
    expect(checkGame(game, bad).problems[0].text).toMatch(/isn't legal/)
  })
})

// Check a replay file exported from Hearthside Table:
//   REPLAY=path/to/game.hsreplay.json npx vitest run src/adventure/check.test.ts
const file = process.env.REPLAY
describe.runIf(file)('a replay file', () => {
  it('replays without rule problems', () => {
    const data = JSON.parse(readFileSync(file!, 'utf8'))
    const replay = data.replay ?? data
    const { problems, final } = checkGame(replay.game, replay.moves)
    const out = [
      `${replay.names?.join(' vs ')}: ${replay.moves.length} moves, round ${final.round}, ${final.step.k}.`,
      ...problems.map(
        (p) => `Move ${p.move + 1} (round ${p.round}): ${p.text}\n    ${p.log.join('\n    ')}`,
      ),
      '--- log ---',
      ...final.log.map((l) => `${l.n}. ${l.text}`),
    ]
    process.stdout.write(`\n${out.join('\n')}\n`)
    expect(problems).toEqual([])
  })
})
