import { describe, expect, it } from 'vitest'
import {
  bracket,
  createTournament,
  currentMatches,
  nextGameStart,
  placings,
  PRESETS,
  recordGame,
  roundRobinRounds,
  standings,
  type Entrant,
  type GameRecord,
  type Tournament,
  type TournamentSpec,
} from './tournament'

const entrants = (n: number): Entrant[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    bot: 'normal',
    deck: [],
    deckName: 'Deck',
  }))

/** The lower-numbered player always wins (so the results are easy to predict). */
const strength = (id: string) => -Number(id.slice(1))

const game = (winner: 0 | 1, first: 0 | 1): GameRecord => ({
  seed: 1,
  first,
  winner,
  moves: [],
  points: winner === 0 ? [4, 1] : [1, 4],
  rounds: 3,
})

/** Play the whole tournament out, checking each game's initiative rule as it goes. */
function playOut(t: Tournament): Tournament {
  for (let n = 0; n < 2000 && !t.done; n++) {
    const m = currentMatches(t).find((x) => x.winner === null)
    if (!m) throw new Error('stuck: no open match but not done')
    const start = nextGameStart(t, m)
    const last = m.games.at(-1)
    if (last) expect(start.initiative).toBe(last.first === 0 ? 1 : 0)
    else expect(start.opening).toBe(t.spec.opening)
    const first = (start.initiative ?? 0) as 0 | 1
    const winner = strength(m.a) > strength(m.b!) ? 0 : 1
    t = recordGame(t, m.id, game(winner, first))
  }
  expect(t.done).toBe(true)
  return t
}

describe('pairings', () => {
  it('round robin: everyone meets everyone once', () => {
    for (const n of [4, 5, 8]) {
      const ids = entrants(n).map((e) => e.id)
      const rounds = roundRobinRounds(ids)
      const met = new Set<string>()
      for (const r of rounds) for (const [a, b] of r) if (b) met.add([a, b].sort().join('|'))
      expect(met.size).toBe((n * (n - 1)) / 2)
      // Nobody plays twice in a round.
      for (const r of rounds) {
        const seen = r.flatMap(([a, b]) => (b ? [a, b] : [a]))
        expect(new Set(seen).size).toBe(seen.length)
      }
    }
  })

  it('a knockout bracket seeds 1–8, 4–5, 2–7, 3–6', () => {
    const seeds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']
    expect(bracket(seeds)).toEqual([
      ['s1', 's8'],
      ['s4', 's5'],
      ['s2', 's7'],
      ['s3', 's6'],
    ])
    expect(bracket(['s1', 's2', 's3'])).toEqual([
      ['s1', null],
      ['s2', 's3'],
    ])
  })

  it('swiss: no rematches, and the bye moves on', () => {
    const spec: TournamentSpec = {
      name: 'Odd Swiss',
      players: 7,
      opening: 'coin',
      stages: [{ kind: 'swiss', bestOf: 1, rounds: 4 }],
    }
    const t = playOut(createTournament(spec, entrants(7), 3))
    const pairs = t.matches.filter((m) => m.b).map((m) => [m.a, m.b].sort().join('|'))
    expect(new Set(pairs).size).toBe(pairs.length)
    const byes = t.matches.filter((m) => m.b === null).map((m) => m.a)
    expect(byes).toHaveLength(4)
    expect(new Set(byes).size).toBe(4)
  })
})

describe('the official formats', () => {
  it('Locals: a round robin of 8, the strongest first', () => {
    const t = playOut(createTournament(PRESETS.locals, entrants(8), 1))
    expect(t.matches).toHaveLength(28)
    expect(placings(t).slice(0, 3)).toEqual(['p1', 'p2', 'p3'])
  })

  it('Regionals and Nationals: Swiss, then a top cut', () => {
    const r = playOut(createTournament(PRESETS.regionals, entrants(16), 2))
    expect(r.matches.filter((m) => m.stage === 0)).toHaveLength(24)
    expect(r.matches.filter((m) => m.stage === 1)).toHaveLength(3)
    expect(placings(r)[0]).toBe('p1')
    const n = playOut(createTournament(PRESETS.nationals, entrants(32), 3))
    expect(n.matches.filter((m) => m.stage === 0)).toHaveLength(80)
    expect(n.matches.filter((m) => m.stage === 1)).toHaveLength(7)
    const st = standings(n, 0, n.seeding)
    expect(st[0].wins).toBe(5)
    expect(placings(n)).toHaveLength(32)
  })

  it('Pro Tour: groups of 4, winners to a knockout; best of 3, final best of 5', () => {
    const t = playOut(createTournament(PRESETS.proTour, entrants(16), 4))
    expect(t.groups.map((g) => g.length)).toEqual([4, 4, 4, 4])
    const ko = t.matches.filter((m) => m.stage === 1)
    expect(ko).toHaveLength(3)
    expect(ko.filter((m) => m.bestOf === 5)).toHaveLength(1)
    expect(t.matches.filter((m) => m.stage === 0).every((m) => m.bestOf === 3)).toBe(true)
    // Group winners only: each knockout player won their group.
    const groupOf = (id: string) => t.groups.findIndex((g) => g.includes(id))
    const firstRound = ko.filter((m) => m.round === 1).flatMap((m) => [m.a, m.b!])
    expect(new Set(firstRound.map(groupOf)).size).toBe(4)
    expect(placings(t)[0]).toBe('p1')
  })

  it('World Championship: 2 groups of 8, top 4 each to a knockout of 8', () => {
    const t = playOut(createTournament(PRESETS.worlds, entrants(16), 5))
    expect(t.groups.map((g) => g.length)).toEqual([8, 8])
    const ko = t.matches.filter((m) => m.stage === 1)
    expect(ko).toHaveLength(7)
    // First round: no two players from the same group.
    const groupOf = (id: string) => t.groups.findIndex((g) => g.includes(id))
    for (const m of ko.filter((x) => x.round === 1)) expect(groupOf(m.a)).not.toBe(groupOf(m.b!))
    expect(ko.find((m) => m.round === 3)?.bestOf).toBe(5)
  })
})

describe('best of 3', () => {
  it('ends at two wins, and the player who went second starts the next game', () => {
    const t0 = createTournament(PRESETS.proTour, entrants(16), 6)
    const m = currentMatches(t0)[0]
    expect(nextGameStart(t0, m)).toEqual({ opening: 'rps' })
    // Game 1: seat 1 had the initiative and won.
    let t = recordGame(t0, m.id, game(1, 1))
    const m1 = t.matches.find((x) => x.id === m.id)!
    expect(nextGameStart(t, m1)).toEqual({ initiative: 0 })
    t = recordGame(t, m.id, game(0, 0))
    t = recordGame(t, m.id, game(0, 1))
    const done = t.matches.find((x) => x.id === m.id)!
    expect(done.winner).toBe(m.a)
    expect(done.games).toHaveLength(3)
  })
})
