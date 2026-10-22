import { shuffle } from '@/playtest/rng'
import type { BotLevel } from '../bot'
import type { Move } from '../engine'
import type { Seat } from '../state'

/**
 * Tournaments, as plain data and pure functions (portable, like the rules
 * engine): formats, pairings, best-of-N matches with the initiative rule,
 * standings with tiebreakers, and placings. Who plays the games (people at
 * the table, bots in workers) is up to the app; it reports each game with
 * `recordGame`.
 */

export type StageKind = 'roundRobin' | 'swiss' | 'groups' | 'knockout'

export interface StageSpec {
  kind: StageKind
  /** Games per match (odd). */
  bestOf: number
  /** Knockout: games in the final, when it differs. */
  finalBestOf?: number
  /** Swiss: rounds to play. */
  rounds?: number
  /** Groups: how many groups (round robin inside each). */
  groups?: number
  /** Groups: how many go on from each group. Knockout: how many it takes (the top cut). */
  advance?: number
}

export interface TournamentSpec {
  name: string
  players: number
  stages: StageSpec[]
  /** Game 1 of a match: rock-paper-scissors or a coin decides the initiative. */
  opening: 'rps' | 'coin'
}

export type PresetId = 'locals' | 'regionals' | 'nationals' | 'proTour' | 'worlds'

/** The official formats from the game roadmap (each can be changed before starting). */
export const PRESETS: Record<PresetId, TournamentSpec> = {
  locals: {
    name: 'Locals',
    players: 8,
    opening: 'rps',
    stages: [{ kind: 'roundRobin', bestOf: 1 }],
  },
  regionals: {
    name: 'Regionals',
    players: 16,
    opening: 'rps',
    stages: [
      { kind: 'swiss', bestOf: 1, rounds: 3 },
      { kind: 'knockout', bestOf: 1, advance: 4 },
    ],
  },
  nationals: {
    name: 'Nationals',
    players: 32,
    opening: 'rps',
    stages: [
      { kind: 'swiss', bestOf: 1, rounds: 5 },
      { kind: 'knockout', bestOf: 1, advance: 8 },
    ],
  },
  proTour: {
    name: 'Pro Tour',
    players: 16,
    opening: 'rps',
    stages: [
      { kind: 'groups', bestOf: 3, groups: 4, advance: 1 },
      { kind: 'knockout', bestOf: 3, finalBestOf: 5, advance: 4 },
    ],
  },
  worlds: {
    name: 'World Championship',
    players: 16,
    opening: 'rps',
    stages: [
      { kind: 'groups', bestOf: 3, groups: 2, advance: 4 },
      { kind: 'knockout', bestOf: 3, finalBestOf: 5, advance: 8 },
    ],
  },
}

export interface Entrant {
  id: string
  name: string
  /** null: a person plays; otherwise the bot's level. */
  bot: BotLevel | null
  deck: string[]
  deckName: string
}

/** One game of a match. Seat 0 is always the match's `a`. */
export interface GameRecord {
  seed: number
  /** Who had the initiative in round 1. */
  first: Seat
  /** The fixed initiative given at the start (games 2+), or the opening used. */
  initiative?: Seat
  opening?: 'rps' | 'coin'
  winner: Seat | null
  moves: Move[]
  points: [number, number]
  rounds: number
}

export interface Match {
  id: string
  stage: number
  round: number
  group?: number
  a: string
  /** null: a bye (a wins). */
  b: string | null
  bestOf: number
  games: GameRecord[]
  winner: string | null
}

export interface Tournament {
  spec: TournamentSpec
  entrants: Entrant[]
  matches: Match[]
  /** The stage being played, and its round (1-based). */
  stage: number
  round: number
  /** Stage 0's seeding (entrant ids in order) and each group's members. */
  seeding: string[]
  groups: string[][]
  done: boolean
  seed: number
}

const winsNeeded = (bestOf: number) => Math.ceil(bestOf / 2)

/** Games each side has won in a match: [a, b]. */
export function score(m: Match): [number, number] {
  return [
    m.games.filter((g) => g.winner === 0).length,
    m.games.filter((g) => g.winner === 1).length,
  ]
}

/**
 * How the next game of a match starts: game 1 by the tournament's opening;
 * after that the player who went second in the game before starts with the
 * initiative (the owner's rule).
 */
export function nextGameStart(
  t: Tournament,
  m: Match,
): { opening?: 'rps' | 'coin'; initiative?: Seat } {
  return seriesStart(m.games, t.spec.opening)
}

/** The start of a match's next game, from the games so far. */
export function seriesStart(
  games: GameRecord[],
  opening: 'rps' | 'coin',
): { opening?: 'rps' | 'coin'; initiative?: Seat } {
  const last = games.at(-1)
  if (!last) return { opening }
  return { initiative: (last.first === 0 ? 1 : 0) as Seat }
}

/** A game's seed: fixed by the tournament, the match and the game number. */
export function gameSeed(t: Tournament, matchId: string, n: number): number {
  let h = t.seed ^ 0x9e3779b9
  for (const ch of `${matchId}#${n}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

export function createTournament(
  spec: TournamentSpec,
  entrants: Entrant[],
  seed: number,
): Tournament {
  const [order] = shuffle(
    entrants.map((e) => e.id),
    seed,
  )
  const t: Tournament = {
    spec,
    entrants,
    matches: [],
    stage: 0,
    round: 0,
    seeding: order,
    groups: [],
    done: false,
    seed,
  }
  return startStage(t, 0)
}

function startStage(t: Tournament, stage: number): Tournament {
  const spec = t.spec.stages[stage]
  const next: Tournament = { ...t, stage, round: 0 }
  const ids = stageEntrants(t, stage)
  if (spec.kind === 'groups') {
    const n = Math.max(1, spec.groups ?? 1)
    // Snake seeding: 1 2 3 4 4 3 2 1 …
    const groups: string[][] = Array.from({ length: n }, () => [])
    ids.forEach((id, i) => {
      const lap = Math.floor(i / n)
      groups[lap % 2 === 0 ? i % n : n - 1 - (i % n)].push(id)
    })
    next.groups = groups
  }
  return pairRound(next)
}

/** Round-robin rounds for a list (the circle method; null is a bye). */
export function roundRobinRounds(ids: string[]): [string, string | null][][] {
  const list: (string | null)[] = [...ids]
  if (list.length % 2) list.push(null)
  const n = list.length
  const rounds: [string, string | null][][] = []
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string | null][] = []
    for (let i = 0; i < n / 2; i++) {
      const x = list[i]
      const y = list[n - 1 - i]
      if (x === null && y === null) continue
      pairs.push(x === null ? [y!, null] : [x, y])
    }
    rounds.push(pairs)
    // Keep the first in place, turn the rest.
    list.splice(1, 0, list.pop()!)
  }
  return rounds
}

/** Who plays in a stage, in seed order: stage 0 everyone; later stages who advanced. */
function stageEntrants(t: Tournament, stage: number): string[] {
  if (stage === 0) return t.seeding
  return advancing(t, stage - 1)
}

function pairRound(t: Tournament): Tournament {
  const stage = t.stage
  const spec = t.spec.stages[stage]
  const ids = stageEntrants(t, stage)
  const round = t.round + 1
  const made: Match[] = []
  const add = (a: string, b: string | null, group?: number, bestOf = spec.bestOf) =>
    made.push({
      id: `s${stage}r${round}${group === undefined ? '' : `g${group}`}m${made.length + 1}`,
      stage,
      round,
      group,
      a,
      b,
      bestOf,
      games: [],
      winner: b === null ? a : null,
    })
  if (spec.kind === 'roundRobin') {
    const rounds = roundRobinRounds(ids)
    if (round > rounds.length) return finishStage(t)
    for (const [a, b] of rounds[round - 1]) add(a, b)
  } else if (spec.kind === 'groups') {
    const all = t.groups.map(roundRobinRounds)
    const longest = Math.max(...all.map((r) => r.length))
    if (round > longest) return finishStage(t)
    all.forEach((rounds, g) => {
      for (const [a, b] of rounds[round - 1] ?? []) add(a, b, g)
    })
  } else if (spec.kind === 'swiss') {
    if (round > (spec.rounds ?? 3)) return finishStage(t)
    for (const [a, b] of swissPairs(t, ids)) add(a, b)
  } else {
    // Knockout: the first round from the seeds, then winners in bracket order.
    const size = Math.min(spec.advance ?? ids.length, ids.length)
    const prev = t.matches.filter((m) => m.stage === stage && m.round === round - 1)
    const players = round === 1 ? ids.slice(0, size) : prev.map((m) => m.winner!)
    if (players.length <= 1) return { ...t, done: true }
    const final = players.length === 2
    const bestOf = final ? (spec.finalBestOf ?? spec.bestOf) : spec.bestOf
    if (round === 1) for (const [a, b] of bracket(players)) add(a, b, undefined, bestOf)
    else
      for (let i = 0; i < players.length; i += 2)
        add(players[i], players[i + 1] ?? null, undefined, bestOf)
  }
  return { ...t, round, matches: [...t.matches, ...made] }
}

/** First-round knockout pairs in bracket order: 1–8, 4–5, 2–7, 3–6 (byes for missing seeds). */
export function bracket(seeds: string[]): [string, string | null][] {
  let size = 1
  while (size < seeds.length) size *= 2
  let order = [1]
  while (order.length < size) order = order.flatMap((s) => [s, order.length * 2 + 1 - s])
  const pairs: [string, string | null][] = []
  for (let i = 0; i < order.length; i += 2) {
    const a = seeds[order[i] - 1]
    const b = seeds[order[i + 1] - 1] ?? null
    if (a) pairs.push([a, b])
    else if (b) pairs.push([b, null])
  }
  return pairs
}

/** Swiss pairs: by record, best first, never a rematch if avoidable; the bye goes low. */
function swissPairs(t: Tournament, ids: string[]): [string, string | null][] {
  const st = standings(t, t.stage, ids)
  const order = st.map((r) => r.id)
  const played = new Set(
    t.matches
      .filter((m) => m.stage === t.stage)
      .flatMap((m) => (m.b ? [`${m.a}|${m.b}`, `${m.b}|${m.a}`] : [])),
  )
  const hadBye = new Set(
    t.matches.filter((m) => m.stage === t.stage && m.b === null).map((m) => m.a),
  )
  let pool = [...order]
  const pairs: [string, string | null][] = []
  if (pool.length % 2) {
    const bye = [...pool].reverse().find((id) => !hadBye.has(id)) ?? pool.at(-1)!
    pool = pool.filter((id) => id !== bye)
    pairs.push([bye, null])
  }
  const solve = (left: string[]): [string, string][] | null => {
    if (!left.length) return []
    const [x, ...rest] = left
    for (let i = 0; i < rest.length; i++) {
      if (played.has(`${x}|${rest[i]}`)) continue
      const sub = solve(rest.filter((_, k) => k !== i))
      if (sub) return [[x, rest[i]], ...sub]
    }
    return null
  }
  const found = solve(pool)
  // Every pairing a rematch: pair in order.
  const plain: [string, string][] = []
  for (let i = 0; i < pool.length; i += 2) plain.push([pool[i], pool[i + 1]])
  return [...(found ?? plain), ...pairs]
}

export interface StandingRow {
  id: string
  points: number
  wins: number
  losses: number
  gameWins: number
  gameLosses: number
  /** Opponents' match-win %, game-win % and opponents' game-win % (each at least 33%). */
  omw: number
  gw: number
  ogw: number
}

/** Standings for a stage (optionally one group): points, then OMW%, GW%, OGW%. */
export function standings(
  t: Tournament,
  stage: number,
  ids: string[],
  group?: number,
): StandingRow[] {
  const ms = t.matches.filter(
    (m) => m.stage === stage && m.winner !== null && (group === undefined || m.group === group),
  )
  const base = (id: string) => {
    let wins = 0
    let losses = 0
    let gw = 0
    let gl = 0
    const opps: string[] = []
    for (const m of ms) {
      if (m.a !== id && m.b !== id) continue
      const [sa, sb] = score(m)
      const me = m.a === id
      if (m.b === null) {
        wins++
        gw += winsNeeded(m.bestOf)
        continue
      }
      opps.push(me ? m.b : m.a)
      if (m.winner === id) wins++
      else losses++
      gw += me ? sa : sb
      gl += me ? sb : sa
    }
    return { wins, losses, gw, gl, opps }
  }
  const rows = new Map(ids.map((id) => [id, base(id)]))
  const floor = (x: number) => Math.max(1 / 3, x)
  const mw = (id: string) => {
    const r = rows.get(id)
    return r && r.wins + r.losses ? floor(r.wins / (r.wins + r.losses)) : 1 / 3
  }
  const gwp = (id: string) => {
    const r = rows.get(id)
    return r && r.gw + r.gl ? floor(r.gw / (r.gw + r.gl)) : 1 / 3
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  const out = ids.map((id) => {
    const r = rows.get(id)!
    return {
      id,
      points: r.wins * 3,
      wins: r.wins,
      losses: r.losses,
      gameWins: r.gw,
      gameLosses: r.gl,
      omw: avg(r.opps.map(mw)),
      gw: gwp(id),
      ogw: avg(r.opps.map(gwp)),
    }
  })
  const seedOf = new Map(t.seeding.map((id, i) => [id, i]))
  return out.sort(
    (x, y) =>
      y.points - x.points ||
      y.omw - x.omw ||
      y.gw - x.gw ||
      y.ogw - x.ogw ||
      (seedOf.get(x.id) ?? 0) - (seedOf.get(y.id) ?? 0),
  )
}

/** Who goes on from a finished stage to the next, in seed order for it. */
function advancing(t: Tournament, stage: number): string[] {
  const spec = t.spec.stages[stage]
  const nextSpec = t.spec.stages[stage + 1]
  const ids = stage === 0 ? t.seeding : advancing(t, stage - 1)
  if (spec.kind === 'groups') {
    const k = spec.advance ?? 1
    const tables = t.groups.map((g, i) => standings(t, stage, g, i).map((r) => r.id))
    // Group winners first, then the runners-up, and so on (A1 B1 A2 B2 …): with the
    // bracket's 1–8, 4–5 order, players from one group don't meet in the first round.
    const out: string[] = []
    for (let place = 0; place < k; place++)
      for (const table of tables) if (table[place]) out.push(table[place])
    return out
  }
  if (spec.kind === 'knockout') return ids
  const table = standings(t, stage, ids).map((r) => r.id)
  return nextSpec?.advance ? table.slice(0, nextSpec.advance) : table
}

function finishStage(t: Tournament): Tournament {
  if (t.stage + 1 >= t.spec.stages.length) return { ...t, done: true }
  return startStage(t, t.stage + 1)
}

/** Every match of the round being played. */
export const currentMatches = (t: Tournament) =>
  t.matches.filter((m) => m.stage === t.stage && m.round === t.round)

/** Add a finished game to a match; when the round is complete, pair the next one. */
export function recordGame(t: Tournament, matchId: string, game: GameRecord): Tournament {
  const matches = t.matches.map((m) => {
    if (m.id !== matchId || m.winner !== null) return m
    const games = [...m.games, game]
    const next = { ...m, games }
    const [sa, sb] = score(next)
    const need = winsNeeded(m.bestOf)
    if (sa >= need) next.winner = m.a
    else if (sb >= need) next.winner = m.b
    return next
  })
  const updated = { ...t, matches }
  return currentMatches(updated).every((m) => m.winner !== null) ? pairRound(updated) : updated
}

/** Final placings: the knockout's results first (if any), then the earlier stages' standings. */
export function placings(t: Tournament): string[] {
  const out: string[] = []
  const add = (id: string | null | undefined) => id && !out.includes(id) && out.push(id)
  for (let stage = t.spec.stages.length - 1; stage >= 0; stage--) {
    const spec = t.spec.stages[stage]
    const ms = t.matches.filter((m) => m.stage === stage)
    if (!ms.length) continue
    if (spec.kind === 'knockout') {
      const rounds = Math.max(...ms.map((m) => m.round))
      for (let r = rounds; r >= 1; r--) {
        const inRound = ms.filter((m) => m.round === r)
        for (const m of inRound) add(m.winner)
        for (const m of inRound) add(m.winner === m.a ? m.b : m.a)
      }
    } else {
      const ids = stage === 0 ? t.seeding : advancing(t, stage - 1)
      if (spec.kind === 'groups') {
        // Interleave the groups' tables place by place.
        const tables = t.groups.map((g, i) => standings(t, stage, g, i).map((r) => r.id))
        const longest = Math.max(...tables.map((x) => x.length))
        for (let p = 0; p < longest; p++) for (const table of tables) add(table[p])
      } else for (const r of standings(t, stage, ids)) add(r.id)
    }
  }
  for (const e of t.entrants) add(e.id)
  return out
}

/** The most games a player can play in a stage's match (for showing "best of 3", etc.). */
export const matchLabel = (m: Match) => (m.bestOf === 1 ? 'Best of 1' : `Best of ${m.bestOf}`)
