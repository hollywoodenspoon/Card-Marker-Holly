import { botMove, type BotLevel } from '../bot'
import { quickMove } from '../bot/policies'
import type { AsCard } from '../cards'
import { checkGame } from '../check'
import { checkDeck } from '../deck'
import { randomDeck } from '../deckgen/values'
import { apply, createGame, type Move, type NewGame } from '../engine'
import type { RevealRule, Seat } from '../state'

/**
 * The bot ladder: every chosen bot plays every other on the same decks and
 * seeds, seats swapped, and gets a rating (Elo from a Bradley–Terry fit, Easy
 * at 1000). It is how a bot change proves it helps, and how Hard's budgets
 * are chosen.
 */

export interface LadderEntrant {
  id: string
  name: string
  level: BotLevel | 'quick'
  /** Hard: iterations per decision. */
  iterations?: number
}

export const LADDER_ENTRANTS: LadderEntrant[] = [
  { id: 'quick', name: 'Quick', level: 'quick' },
  { id: 'easy', name: 'Easy (Tricks)', level: 'easy' },
  { id: 'normal', name: 'Normal (Search)', level: 'normal' },
  { id: 'hard-100', name: 'Hard 100', level: 'hard', iterations: 100 },
  { id: 'hard-400', name: 'Hard 400', level: 'hard', iterations: 400 },
  { id: 'hard-1600', name: 'Hard 1600', level: 'hard', iterations: 1600 },
]
export const DEFAULT_ENTRANTS = ['quick', 'easy', 'normal', 'hard-100', 'hard-400']
/** The rating anchor. */
const ANCHOR = 'easy'

export interface LadderOptions {
  /** Entrant ids, in LADDER_ENTRANTS. */
  entrants: string[]
  /** Games per pairing. */
  games: number
  seed: number
  reveal?: RevealRule
}

export interface LadderInput {
  packName: string
  cards: AsCard[]
  premades: { name: string; cards: string[] }[]
}

export interface LadderGame {
  /** Entrants (indexes) on seat 0 and seat 1. */
  e: [number, number]
  /** Decks (indexes) on seat 0 and seat 1. */
  d: [number, number]
  seed: number
  check?: boolean
}

export interface LadderSlice {
  cards: AsCard[]
  decks: string[][]
  entrants: LadderEntrant[]
  games: LadderGame[]
  reveal?: RevealRule
}

export interface LadderGameResult {
  e: [number, number]
  winner: Seat | null
  /** Milliseconds thinking and decisions made, per seat. */
  ms: [number, number]
  moves: [number, number]
}

export interface LadderSliceResult {
  games: LadderGameResult[]
  checked: number
  problems: string[]
}

const MAX_MOVES = 4000
/** Random legal decks added to the premades. */
const RANDOM_DECKS = 6

/** Which decks the ladder plays: the legal premades, plus random legal decks. */
export function ladderDecks(input: LadderInput, seed: number): string[][] {
  const byId = Object.fromEntries(input.cards.map((c) => [c.id, c]))
  const out = input.premades.filter((p) => checkDeck(p.cards, byId).ok).map((p) => p.cards)
  let s = seed
  for (let i = 0; i < RANDOM_DECKS; i++) {
    const [d, next] = randomDeck(input.cards, s)
    s = next
    out.push(d)
  }
  return out
}

/** Every pairing of entrants, `games` games each, seats and decks taking turns. */
export function ladderGames(entrants: number, decks: number, o: LadderOptions): LadderGame[] {
  const out: LadderGame[] = []
  let k = 0
  for (let a = 0; a < entrants; a++)
    for (let b = a + 1; b < entrants; b++)
      for (let g = 0; g < o.games; g++) {
        const pair = Math.floor(g / 2)
        const da = pair % decks
        const db = (pair * 7 + 3) % decks
        // Each deck pairing is played twice, with the bots on swapped seats.
        const swap = g % 2 === 1
        out.push({
          e: swap ? [b, a] : [a, b],
          d: [da, db],
          seed: (o.seed + pair * 104729 + a * 7919 + b * 31) >>> 0,
          check: k++ % 50 === 0,
        })
      }
  return out
}

/** Play a slice of ladder games (in a worker). */
export function playLadderSlice({
  cards,
  decks,
  entrants,
  games,
  reveal,
}: LadderSlice): LadderSliceResult {
  const out: LadderSliceResult = { games: [], checked: 0, problems: [] }
  for (const g of games) {
    const game: NewGame = {
      cards,
      decks: [decks[g.d[0]], decks[g.d[1]]],
      names: ['A', 'B'],
      seed: g.seed,
      reveal,
    }
    let s = createGame(game)
    const moves: Move[] = []
    const ms: [number, number] = [0, 0]
    const count: [number, number] = [0, 0]
    const r = { seed: g.seed ^ 0x9e3779b9 }
    let problem: string | null = null
    for (let n = 0; n < MAX_MOVES && s.step.k !== 'over'; n++) {
      const seat = s.step.seat
      const who = entrants[g.e[seat]]
      const t = Date.now()
      const m =
        who.level === 'quick'
          ? quickMove(s, r)
          : botMove(s, who.level, g.seed + n * 31, { iterations: who.iterations })
      ms[seat] += Date.now() - t
      count[seat]++
      const next = apply(s, m)
      if (next === s) {
        problem = `${who.name}'s move was refused: ${JSON.stringify(m)}`
        break
      }
      if (g.check) moves.push(m)
      s = next
    }
    const where = `seed ${g.seed}, ${entrants[g.e[0]].name} against ${entrants[g.e[1]].name}`
    if (problem) out.problems.push(`${where}: ${problem}`)
    else if (s.step.k !== 'over') out.problems.push(`${where}: not over after ${MAX_MOVES} moves`)
    if (g.check && !problem) {
      out.checked++
      for (const p of checkGame(game, moves).problems)
        out.problems.push(`${where}, move ${p.move + 1}: ${p.text}`)
    }
    out.games.push({ e: g.e, winner: s.winner?.seat ?? null, ms, moves: count })
  }
  return out
}

export interface LadderRow {
  id: string
  name: string
  elo: number
  games: number
  wins: number
  /** Average thinking time per decision (ms). */
  msPerMove: number
}

export interface LadderResult {
  packName: string
  options: LadderOptions
  startedAt: number
  seconds: number
  stopped: boolean
  rows: LadderRow[]
  /** [wins of the row entrant, games] against each column entrant. */
  matrix: [number, number][][]
  draws: number
  checked: number
  problems: string[]
}

/**
 * Ratings by Bradley–Terry (the minorization–maximization fit), as Elo: 400 ×
 * log10 of strength, the anchor at 1000. A draw counts half to each side.
 */
export function fitRatings(n: number, wins: number[][], anchor: number): number[] {
  const g = new Array(n).fill(1)
  for (let step = 0; step < 500; step++) {
    let moved = 0
    for (let i = 0; i < n; i++) {
      const w = wins[i].reduce((a, b) => a + b, 0)
      let den = 0
      for (let j = 0; j < n; j++) {
        const games = wins[i][j] + wins[j][i]
        if (i !== j && games) den += games / (g[i] + g[j])
      }
      if (!den) continue
      // A bot that never won (or never lost) still gets a finite rating.
      const next = Math.max(w, 0.5) / den
      moved = Math.max(moved, Math.abs(Math.log(next / g[i])))
      g[i] = next
    }
    if (moved < 1e-9) break
  }
  const base = Math.log10(g[anchor])
  return g.map((x) => Math.round(1000 + 400 * (Math.log10(x) - base)))
}

/** Games per worker job: small, so Stop and the progress bar respond quickly. */
const SLICE = 4

/**
 * Plan and play a ladder: `exec` plays the slices (in workers) and returns the
 * ones that finished, so a stopped run keeps what was played.
 */
export async function runLadder(
  input: LadderInput,
  options: LadderOptions,
  exec: (slices: LadderSlice[], total: number) => Promise<(LadderSliceResult | undefined)[]>,
  stopped: () => boolean,
): Promise<LadderResult> {
  const startedAt = Date.now()
  const entrants = LADDER_ENTRANTS.filter((e) => options.entrants.includes(e.id))
  const decks = ladderDecks(input, options.seed)
  const games = ladderGames(entrants.length, decks.length, options)
  const slices: LadderSlice[] = []
  for (let i = 0; i < games.length; i += SLICE)
    slices.push({
      cards: input.cards,
      decks,
      entrants,
      games: games.slice(i, i + SLICE),
      reveal: options.reveal,
    })
  const done = (await exec(slices, games.length)).filter((x): x is LadderSliceResult => !!x)
  return analyzeLadder(input, options, entrants, done, {
    startedAt,
    seconds: (Date.now() - startedAt) / 1000,
    stopped: stopped() || done.length < slices.length,
  })
}

/** Add up slices into ratings, the matrix and time per decision. */
export function analyzeLadder(
  input: Pick<LadderInput, 'packName'>,
  options: LadderOptions,
  entrants: LadderEntrant[],
  slices: LadderSliceResult[],
  info: { startedAt: number; seconds: number; stopped: boolean },
): LadderResult {
  const n = entrants.length
  const wins = Array.from({ length: n }, () => new Array(n).fill(0))
  const matrix: [number, number][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => [0, 0] as [number, number]),
  )
  const ms = new Array(n).fill(0)
  const moves = new Array(n).fill(0)
  let draws = 0
  for (const sl of slices)
    for (const g of sl.games) {
      const [a, b] = g.e
      for (const seat of [0, 1] as const) {
        ms[g.e[seat]] += g.ms[seat]
        moves[g.e[seat]] += g.moves[seat]
      }
      matrix[a][b][1]++
      matrix[b][a][1]++
      if (g.winner === null) {
        draws++
        wins[a][b] += 0.5
        wins[b][a] += 0.5
        continue
      }
      const w = g.e[g.winner]
      const l = g.e[1 - g.winner]
      wins[w][l]++
      matrix[w][l][0]++
    }
  const anchor = Math.max(
    0,
    entrants.findIndex((e) => e.id === ANCHOR),
  )
  const elo = fitRatings(n, wins, anchor)
  const rows = entrants.map((e, i) => ({
    id: e.id,
    name: e.name,
    elo: elo[i],
    games: matrix[i].reduce((a, c) => a + c[1], 0),
    wins: matrix[i].reduce((a, c) => a + c[0], 0),
    msPerMove: moves[i] ? ms[i] / moves[i] : 0,
  }))
  return {
    packName: input.packName,
    options,
    ...info,
    rows,
    matrix,
    draws,
    checked: slices.reduce((a, s) => a + s.checked, 0),
    problems: slices.flatMap((s) => s.problems),
  }
}

/** Win rate with a 95% margin, as text. */
export function rateText(w: number, n: number): string {
  if (!n) return '–'
  const p = w / n
  const m = 1.96 * Math.sqrt((p * (1 - p)) / n)
  return `${Math.round(100 * p)}% ±${Math.round(100 * m)}`
}

export const REVEAL_NAMES: Record<RevealRule, string> = {
  classic: 'classic reveals',
  pairs: 'pairs throughout',
  triples: 'triples',
}

/** The ladder as Markdown (Copy report and the results file). */
export function ladderReport(r: LadderResult): string {
  const order = r.rows.map((_, i) => i).sort((a, b) => r.rows[b].elo - r.rows[a].elo)
  const total = r.matrix.reduce((a, row) => a + row.reduce((b, c) => b + c[1], 0), 0) / 2
  const L = [
    `# Bot ladder: ${r.packName}`,
    '',
    `${total} games${r.stopped ? ' (stopped early)' : ''}, ${r.options.games} per pairing, ${REVEAL_NAMES[r.options.reveal ?? 'classic']}, seed ${r.options.seed}, ${Math.round(r.seconds)} s. Rules checker: ${r.checked} games checked, ${r.problems.length} problems.`,
    '',
    '| Bot | Rating | Win rate | Games | Thinking per move |',
    '|---|---:|---:|---:|---:|',
    ...order.map((i) => {
      const x = r.rows[i]
      return `| ${x.name} | ${x.elo} | ${rateText(x.wins, x.games)} | ${x.games} | ${x.msPerMove.toFixed(1)} ms |`
    }),
    '',
    'Win rate of the row bot against the column bot (±95% margin).',
    '',
    `| | ${order.map((i) => r.rows[i].name).join(' | ')} |`,
    `|---|${order.map(() => '---:').join('|')}|`,
    ...order.map(
      (i) =>
        `| **${r.rows[i].name}** | ${order.map((j) => (i === j ? '–' : rateText(...r.matrix[i][j]))).join(' | ')} |`,
    ),
    '',
    'Ratings are Elo from a Bradley–Terry fit, Easy at 1000: 100 points is about a 64% win rate, 200 about 76%.',
  ]
  if (r.problems.length)
    L.push('', '## Problems', '', ...r.problems.slice(0, 50).map((p) => `- ${p}`))
  return L.join('\n') + '\n'
}
