/**
 * Running a tournament in the world: who is invited, who plays, how a finished
 * tournament changes ratings, points, prizes and the watched results. The player's
 * own matches are reported by the runtime; everything else here is calculated.
 */
import type { Calendar } from '../model/calendar'
import { eventsOn } from '../model/calendar'
import type { Step } from '../model/events'
import { levelOf, type League, type TournamentDef } from '../model/league'
import { createTourney, placings, settleAll, winChance, type Contender, type Tourney } from './bracket'
import type { LCard } from './cards'
import { makeDuelist } from './duelists'
import { makeRng, weighted, type Rng } from './rng'
import type { Duelist, WorldState } from './worldState'

export const PLAYER = 'player'

export interface Entry {
  ok: boolean
  /** Why not: 'points' (needs more points) or 'invite' (not invited this time). */
  reason?: 'points' | 'invite'
  need?: number
}

const hash = (s: string, seed: number) => {
  let h = (seed ^ 0x9e3779b9) >>> 0
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Whether the player may enter: enough points, then invited (a fixed roll per tournament and week). */
export function entryFor(def: TournamentDef, w: WorldState, week: number): Entry {
  if (def.entry.kind === 'open') return { ok: true }
  const have = w.points[def.entry.track] ?? 0
  if (have < def.entry.points) return { ok: false, reason: 'points', need: def.entry.points }
  const roll = makeRng(hash(`${def.id}:${week}`, w.seed))() * 100
  return roll < def.entry.chance ? { ok: true } : { ok: false, reason: 'invite' }
}

/** Picks `count` duelists for a field by level weights and region, making up more if needed. */
export function buildField(
  def: TournamentDef,
  league: League,
  w: WorldState,
  count: number,
  rng: Rng,
  cards: LCard[],
  exclude: string[] = [],
): { world: WorldState; ids: string[] } {
  const taken = new Set(w.duelists.map((d) => d.name))
  const duelists = [...w.duelists]
  const weightOf = (d: Duelist) => {
    if (exclude.includes(d.id)) return 0
    if (def.region === 'home' && d.region !== w.region) return 0
    const lv = levelOf(league, d.rating)
    return lv ? (def.field[lv.id] ?? 0) : 0
  }
  const ids: string[] = []
  let pool = duelists.filter((d) => weightOf(d) > 0)
  while (ids.length < count) {
    let pick = weighted(rng, pool, weightOf)
    if (!pick) {
      const levels = league.levels.filter((l) => (def.field[l.id] ?? 0) > 0)
      const level = weighted(rng, levels, (l) => def.field[l.id] ?? 0) ?? league.levels[0]
      if (!level) break
      pick = makeDuelist(league, rng, level, cards, taken, def.region === 'home' ? w.region : undefined)
      duelists.push(pick)
    } else {
      pool = pool.filter((d) => d.id !== pick!.id)
    }
    ids.push(pick.id)
  }
  return { world: { ...w, duelists }, ids }
}

export const contendersOf = (w: WorldState, ids: string[]): Contender[] =>
  ids.map((id) =>
    id === PLAYER
      ? { id, name: 'You', rating: w.rating }
      : { id, name: w.duelists.find((d) => d.id === id)?.name ?? id, rating: w.duelists.find((d) => d.id === id)?.rating ?? 1000 },
  )

/** Ratings after the tournament: every settled match moves both players' ratings. */
export function ratingsAfter(t: Tourney, step: number): Map<string, number> {
  const r = new Map(t.contenders.map((c) => [c.id, c.rating]))
  for (const m of t.matches) {
    if (!m.b || !m.winner || m.forfeit) continue
    const ra = r.get(m.a) ?? 1000
    const rb = r.get(m.b) ?? 1000
    const ea = winChance(ra, rb)
    const sa = m.winner === m.a ? 1 : 0
    r.set(m.a, ra + step * (sa - ea))
    r.set(m.b, rb + step * (1 - sa - (1 - ea)))
  }
  return r
}

export interface Outcome {
  world: WorldState
  /** The player's place (1 = won), or 0 when they didn't play. */
  place: number
  prize: number
  points: number
  field: number
}

/**
 * A finished tournament's effects on the world: ratings, points and prizes for the
 * player, played counts, and the top decks of a watched tournament. `playerDeck`
 * is the deck the player used (ids, one per copy).
 */
export function finishTourney(
  def: TournamentDef,
  league: League,
  w: WorldState,
  t: Tourney,
  week: number,
  playerDeck: string[] = [],
): Outcome {
  const order = placings(t)
  const place = order.indexOf(PLAYER) + 1
  const ratings = ratingsAfter(t, league.ratingStep)
  const duelists = w.duelists.map((d) =>
    ratings.has(d.id) ? { ...d, rating: Math.round(ratings.get(d.id)!), played: d.played + 1 } : d,
  )
  const points = place ? (def.pointsByPlace[place - 1] ?? 0) : 0
  const share = place ? (def.prizeSplit[place - 1] ?? 0) : 0
  const prize = Math.round((def.prizePool * share) / 100)
  const next: WorldState = {
    ...w,
    duelists,
    rating: place ? Math.round(ratings.get(PLAYER) ?? w.rating) : w.rating,
    ran: { ...w.ran, [def.id]: week },
    points: def.track && points ? { ...w.points, [def.track]: (w.points[def.track] ?? 0) + points } : w.points,
    history: place
      ? [...w.history, { week, tournament: def.id, name: def.name, place, of: order.length, prize, points }].slice(-300)
      : w.history,
  }
  if (def.watchForBans) {
    const top = order.slice(0, Math.max(1, league.bans.topPlacings))
    const decks = top
      .map((id) => (id === PLAYER ? playerDeck : (next.duelists.find((d) => d.id === id)?.deck ?? [])))
      .filter((d) => d.length)
    next.results = [...next.results, { week, tournament: def.id, name: def.name, decks }].slice(-40)
  }
  return { world: next, place, prize, points, field: order.length }
}

/** Plays a whole tournament off-camera (no player in it). */
export function simulateTourney(
  def: TournamentDef,
  league: League,
  w: WorldState,
  week: number,
  cards: LCard[],
  rng: Rng,
): WorldState {
  const { world, ids } = buildField(def, league, w, def.players, rng, cards)
  const t = settleAll(createFor(def, contendersOf(world, ids), rng.seed()))
  return finishTourney(def, league, world, t, week).world
}

export const createFor = (def: TournamentDef, contenders: Contender[], seed: number) =>
  createTourney(def.stages, contenders, seed)

// ---------- finding tournaments in the calendar ----------

/** The tournament ids a list of steps would run (walks into branches). */
export function tournamentsIn(steps: Step[]): string[] {
  const out: string[] = []
  for (const s of steps) {
    if (s.kind === 'effect') {
      if (s.piece === 'tournament.run' && typeof s.args.tournament === 'string') out.push(s.args.tournament)
    } else if (s.kind === 'if') out.push(...tournamentsIn(s.then), ...tournamentsIn(s.else))
    else if (s.kind === 'choice') for (const o of s.options) out.push(...tournamentsIn(o.steps))
    else for (const b of s.branches) out.push(...tournamentsIn(b.steps))
  }
  return out
}

/** The tournaments the calendar holds on a week. */
export function tournamentsOn(cal: Calendar, week: number, calSeed: number): string[] {
  return [...new Set(eventsOn(cal, week, calSeed).flatMap((e) => tournamentsIn(e.steps)))]
}
