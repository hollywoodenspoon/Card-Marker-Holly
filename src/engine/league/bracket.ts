/**
 * Tournaments as plain data and pure functions: stages chain (round robin, swiss,
 * groups, single and double elimination), the first `advance` of a stage go on to
 * the next, and matches are settled either by someone playing them or by a quick
 * calculation from ratings. Seeded, so a tournament repeats exactly. No UI, no
 * game rules: who wins a played match is reported with `settle`.
 */
import type { StageDef } from '../model/league'

export interface Contender {
  id: string
  name: string
  rating: number
}

export interface BMatch {
  id: string
  stage: number
  round: number
  group?: number
  a: string
  /** null: a bye (a goes on without playing). */
  b: string | null
  bestOf: number
  winner: string | null
  /** Games won by a and b (a forfeit counts as a straight loss). */
  score: [number, number]
  forfeit?: boolean
}

export interface Tourney {
  stages: StageDef[]
  contenders: Contender[]
  matches: BMatch[]
  stage: number
  round: number
  /** Stage 1's order: best rating first. */
  seeding: string[]
  groups: string[][]
  done: boolean
  seed: number
}

const need = (bestOf: number) => Math.ceil(bestOf / 2)

/** mulberry32, one number from a seed. */
export function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const hash = (s: string, seed: number) => {
  let h = (seed ^ 0x9e3779b9) >>> 0
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Chance that a player rated `a` wins a game against one rated `b` (Elo). */
export const winChance = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400))

/** Plays a match of best-of-N games by rating; returns the games won by each side. */
export function quickScore(
  a: Contender,
  b: Contender,
  bestOf: number,
  seed: number,
): [number, number] {
  const p = winChance(a.rating, b.rating)
  const to = need(bestOf)
  let x = 0
  let y = 0
  for (let g = 0; x < to && y < to; g++) {
    if (rand(seed + g * 7919) < p) x++
    else y++
  }
  return [x, y]
}

export function createTourney(stages: StageDef[], contenders: Contender[], seed: number): Tourney {
  const seeding = [...contenders]
    .sort((x, y) => y.rating - x.rating || (x.id < y.id ? -1 : 1))
    .map((c) => c.id)
  const t: Tourney = {
    stages,
    contenders,
    matches: [],
    stage: 0,
    round: 0,
    seeding,
    groups: [],
    done: stages.length === 0 || contenders.length < 2,
    seed,
  }
  return t.done ? t : startStage(t, 0)
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
    list.splice(1, 0, list.pop()!)
  }
  return rounds
}

/** First-round knockout pairs in bracket order: 1–8, 4–5, 2–7, 3–6 (byes for missing seeds). */
export function bracketPairs(seeds: string[]): [string, string | null][] {
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

function startStage(t: Tourney, stage: number): Tourney {
  const spec = t.stages[stage]
  const next: Tourney = { ...t, stage, round: 0 }
  if (spec.kind === 'groups') {
    const ids = stageEntrants(t, stage)
    const n = Math.max(1, Math.min(spec.rounds, ids.length))
    const groups: string[][] = Array.from({ length: n }, () => [])
    ids.forEach((id, i) => {
      const lap = Math.floor(i / n)
      groups[lap % 2 === 0 ? i % n : n - 1 - (i % n)].push(id)
    })
    next.groups = groups
  }
  return pairRound(next)
}

/** Who plays in a stage, in seed order. */
function stageEntrants(t: Tourney, stage: number): string[] {
  return stage === 0 ? t.seeding : advancing(t, stage - 1)
}

const isKnockout = (s: StageDef) => s.kind === 'single' || s.kind === 'double'

function pairRound(t: Tourney): Tourney {
  const stage = t.stage
  const spec = t.stages[stage]
  const ids = stageEntrants(t, stage)
  const round = t.round + 1
  const made: BMatch[] = []
  const add = (a: string, b: string | null, group?: number, bestOf = spec.bestOf) =>
    made.push({
      id: `s${stage}r${round}${group === undefined ? '' : `g${group}`}m${made.length + 1}`,
      stage,
      round,
      group,
      a,
      b,
      bestOf,
      winner: b === null ? a : null,
      score: b === null ? [need(bestOf), 0] : [0, 0],
    })
  if (spec.kind === 'roundRobin') {
    const rounds = roundRobinRounds(ids)
    if (round > rounds.length) return finishStage(t)
    for (const [a, b] of rounds[round - 1]) add(a, b)
  } else if (spec.kind === 'groups') {
    const all = t.groups.map(roundRobinRounds)
    if (round > Math.max(0, ...all.map((r) => r.length))) return finishStage(t)
    all.forEach((rounds, g) => {
      for (const [a, b] of rounds[round - 1] ?? []) add(a, b, g)
    })
  } else if (spec.kind === 'swiss') {
    if (round > Math.max(1, spec.rounds)) return finishStage(t)
    for (const [a, b] of swissPairs(t, ids)) add(a, b)
  } else if (spec.kind === 'single') {
    const prev = t.matches.filter((m) => m.stage === stage && m.round === round - 1)
    const players = round === 1 ? ids : prev.map((m) => m.winner!)
    if (players.length <= 1) return finishStage(t)
    const bestOf = players.length === 2 ? (spec.finalBestOf ?? spec.bestOf) : spec.bestOf
    if (round === 1) for (const [a, b] of bracketPairs(players)) add(a, b, undefined, bestOf)
    else
      for (let i = 0; i < players.length; i += 2)
        add(players[i], players[i + 1] ?? null, undefined, bestOf)
  } else {
    // Double elimination: out at two losses. Players with the same number of losses
    // meet; one left over in a group meets one left over in the other (the final,
    // and a second one if the player with a loss wins it).
    const losses = lossCounts(t, stage, ids)
    const live = ids.filter((id) => (losses.get(id) ?? 0) < 2)
    if (live.length <= 1) return finishStage(t)
    const final = live.length === 2
    const bestOf = final ? (spec.finalBestOf ?? spec.bestOf) : spec.bestOf
    const left: string[] = []
    for (const k of [0, 1]) {
      const g = live.filter((id) => (losses.get(id) ?? 0) === k)
      while (g.length >= 2) add(g.shift()!, g.pop()!, undefined, bestOf)
      if (g.length) left.push(g[0])
    }
    if (left.length === 2) add(left[0], left[1], undefined, bestOf)
    else if (left.length === 1) add(left[0], null)
  }
  return { ...t, round, matches: [...t.matches, ...made] }
}

function lossCounts(t: Tourney, stage: number, ids: string[]) {
  const m = new Map(ids.map((id) => [id, 0]))
  for (const x of t.matches)
    if (x.stage === stage && x.winner && x.b) {
      const loser = x.winner === x.a ? x.b : x.a
      m.set(loser, (m.get(loser) ?? 0) + 1)
    }
  return m
}

function swissPairs(t: Tourney, ids: string[]): [string, string | null][] {
  const order = standings(t, t.stage, ids).map((r) => r.id)
  const played = new Set(
    t.matches
      .filter((m) => m.stage === t.stage)
      .flatMap((m) => (m.b ? [`${m.a}|${m.b}`, `${m.b}|${m.a}`] : [])),
  )
  const hadBye = new Set(t.matches.filter((m) => m.stage === t.stage && m.b === null).map((m) => m.a))
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
  const plain: [string, string][] = []
  for (let i = 0; i + 1 < pool.length; i += 2) plain.push([pool[i], pool[i + 1]])
  return [...(found ?? plain), ...pairs]
}

export interface Row {
  id: string
  points: number
  wins: number
  losses: number
  omw: number
}

/** Standings for a stage (optionally one group): 3 points a win, then opponents' win %, then seed. */
export function standings(t: Tourney, stage: number, ids: string[], group?: number): Row[] {
  const ms = t.matches.filter(
    (m) => m.stage === stage && m.winner !== null && (group === undefined || m.group === group),
  )
  const rec = new Map(ids.map((id) => [id, { w: 0, l: 0, opps: [] as string[] }]))
  for (const m of ms) {
    const a = rec.get(m.a)
    if (a) {
      if (m.winner === m.a) a.w++
      else a.l++
    }
    if (m.b) {
      const b = rec.get(m.b)
      if (b) {
        if (m.winner === m.b) b.w++
        else b.l++
      }
      a?.opps.push(m.b)
      b?.opps.push(m.a)
    }
  }
  const wp = (id: string) => {
    const r = rec.get(id)
    return r && r.w + r.l ? Math.max(1 / 3, r.w / (r.w + r.l)) : 1 / 3
  }
  const seedOf = new Map(t.seeding.map((id, i) => [id, i]))
  return ids
    .map((id) => {
      const r = rec.get(id)!
      const omw = r.opps.length ? r.opps.reduce((s, o) => s + wp(o), 0) / r.opps.length : 0
      return { id, points: r.w * 3, wins: r.w, losses: r.l, omw }
    })
    .sort(
      (x, y) =>
        y.points - x.points || y.omw - x.omw || (seedOf.get(x.id) ?? 0) - (seedOf.get(y.id) ?? 0),
    )
}

/** A knockout stage's order: the one never beaten first, then the later out, the better. */
function knockoutOrder(t: Tourney, stage: number, ids: string[]): string[] {
  const seedOf = new Map(t.seeding.map((id, i) => [id, i]))
  const outAt = new Map<string, number>()
  const losses = new Map(ids.map((id) => [id, 0]))
  const limit = t.stages[stage].kind === 'double' ? 2 : 1
  for (const m of t.matches
    .filter((x) => x.stage === stage && x.winner && x.b)
    .sort((x, y) => x.round - y.round)) {
    const loser = m.winner === m.a ? m.b! : m.a
    const n = (losses.get(loser) ?? 0) + 1
    losses.set(loser, n)
    if (n >= limit) outAt.set(loser, m.round)
  }
  return [...ids].sort(
    (x, y) =>
      (outAt.get(y) ?? 1e9) - (outAt.get(x) ?? 1e9) ||
      (losses.get(x) ?? 0) - (losses.get(y) ?? 0) ||
      (seedOf.get(x) ?? 0) - (seedOf.get(y) ?? 0),
  )
}

/** A stage's players in the order it ranks them. */
export function stageRanking(t: Tourney, stage: number): string[] {
  const spec = t.stages[stage]
  const ids = stageEntrants(t, stage)
  if (isKnockout(spec)) return knockoutOrder(t, stage, ids)
  if (spec.kind === 'groups') {
    const tables = t.groups.map((g, i) => standings(t, stage, g, i).map((r) => r.id))
    const out: string[] = []
    const longest = Math.max(0, ...tables.map((x) => x.length))
    for (let p = 0; p < longest; p++) for (const table of tables) if (table[p]) out.push(table[p])
    return out
  }
  return standings(t, stage, ids).map((r) => r.id)
}

/** Who goes on from a stage: its top `advance` (per group for groups), or everyone. */
function advancing(t: Tourney, stage: number): string[] {
  const spec = t.stages[stage]
  const rank = stageRanking(t, stage)
  if (!spec.advance || spec.advance < 1) return rank
  if (spec.kind === 'groups') {
    const tables = t.groups.map((g, i) => standings(t, stage, g, i).map((r) => r.id))
    const out: string[] = []
    for (let p = 0; p < spec.advance; p++) for (const table of tables) if (table[p]) out.push(table[p])
    return out
  }
  return rank.slice(0, spec.advance)
}

function finishStage(t: Tourney): Tourney {
  if (t.stage + 1 >= t.stages.length) return { ...t, done: true }
  return startStage(t, t.stage + 1)
}

/** The matches waiting to be played in the current round. */
export const openMatches = (t: Tourney) =>
  t.done ? [] : t.matches.filter((m) => m.stage === t.stage && m.round === t.round && !m.winner)

/** Reports a match: winner and games. Pairs the next round once the round is complete. */
export function settle(
  t: Tourney,
  matchId: string,
  winner: string,
  score?: [number, number],
  forfeit = false,
): Tourney {
  const matches = t.matches.map((m) => {
    if (m.id !== matchId || m.winner !== null) return m
    const n = need(m.bestOf)
    const sc: [number, number] = score ?? (winner === m.a ? [n, 0] : [0, n])
    return { ...m, winner, score: sc, forfeit: forfeit || undefined }
  })
  const updated = { ...t, matches }
  return openMatches(updated).length || updated.done ? updated : pairRound(updated)
}

/** Settles every open match except those `keep` returns true for, by rating. */
export function settleRound(t: Tourney, keep?: (m: BMatch) => boolean): Tourney {
  let cur = t
  const byId = new Map(t.contenders.map((c) => [c.id, c]))
  for (const m of openMatches(t)) {
    if (keep?.(m) || !m.b) continue
    const [x, y] = quickScore(byId.get(m.a)!, byId.get(m.b)!, m.bestOf, hash(m.id, t.seed))
    cur = settle(cur, m.id, x > y ? m.a : m.b, [x, y])
  }
  return cur
}

/** Plays out the whole tournament by rating (stops at a match `keep` holds back). */
export function settleAll(t: Tourney, keep?: (m: BMatch) => boolean): Tourney {
  let cur = t
  for (let guard = 0; guard < 500 && !cur.done; guard++) {
    const open = openMatches(cur)
    if (!open.length) break
    const before = open.length
    cur = settleRound(cur, keep)
    if (openMatches(cur).length === before && openMatches(cur).every((m) => keep?.(m))) break
  }
  return cur
}

/** Final placings, best first: the last stage's ranking, then each earlier stage's for those out. */
export function placings(t: Tourney): string[] {
  const out: string[] = []
  const add = (id: string) => out.includes(id) || out.push(id)
  for (let s = Math.min(t.stage, t.stages.length - 1); s >= 0; s--) {
    if (!t.matches.some((m) => m.stage === s)) continue
    for (const id of stageRanking(t, s)) add(id)
  }
  for (const id of t.seeding) add(id)
  return out
}

/** The round being played, in words: "Swiss, round 2". */
export function roundLabel(t: Tourney): string {
  const s = t.stages[t.stage]
  if (!s) return ''
  const name = { roundRobin: 'Round robin', swiss: 'Swiss', groups: 'Groups', single: 'Knockout', double: 'Double elimination' }[s.kind]
  return `${name}, round ${t.round}`
}

/** Whether a contender can still play: in the current stage and, in a knockout, not yet out. */
export function alive(t: Tourney, id: string): boolean {
  if (t.done) return false
  const spec = t.stages[t.stage]
  if (!stageEntrants(t, t.stage).includes(id)) return false
  if (!isKnockout(spec)) return true
  const limit = spec.kind === 'double' ? 2 : 1
  const lost = t.matches.filter(
    (m) => m.stage === t.stage && m.winner && m.b && m.winner !== id && (m.a === id || m.b === id),
  ).length
  return lost < limit
}

/** The ids of the contenders who play in the current stage. */
export const entrants = (t: Tourney) => stageEntrants(t, t.stage)
