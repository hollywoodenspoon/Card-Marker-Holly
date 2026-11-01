/**
 * The season simulator: plays a whole stretch of the game's calendar with a made-up
 * player (how strong, how often they enter, how much they earn and spend on
 * boosters) and reports how points, money, ratings, the collection, bans and prices
 * move. It runs the same weekly step as a real game, so the designer can tune the
 * league's numbers without playing it. Pure and seeded.
 */
import type { Calendar } from '../model/calendar'
import { eventsOn, sizes } from '../model/calendar'
import type { Booster } from '../model/economy'
import type { League } from '../model/league'
import { settleAll } from './bracket'
import type { LCard } from './cards'
import { startingDuelists } from './duelists'
import { drawRelease } from './releases'
import { makeRng } from './rng'
import { stepWeek, nextBans } from './step'
import {
  buildField,
  contendersOf,
  createFor,
  effectsIn,
  entryFor,
  finishTourney,
  PLAYER,
} from './tournaments'
import { emptyWorld, inCirculation, type WorldState } from './worldState'

/** A made-up player. */
export interface Preset {
  id: string
  name: string
  /** The player's starting rating (null: the league's). */
  rating: number | null
  /** Percent chance of entering a tournament they may enter. */
  entryChance: number
  /** Money earned per week. */
  income: number
  /** Boosters bought per week, as far as the money goes. */
  boosters: number
}

export const defaultPresets = (): Preset[] => [
  { id: 'casual', name: 'Casual', rating: null, entryChance: 40, income: 10, boosters: 1 },
  { id: 'regular', name: 'Regular', rating: null, entryChance: 75, income: 15, boosters: 2 },
  { id: 'grinder', name: 'Grinder', rating: null, entryChance: 100, income: 25, boosters: 4 },
]

export interface SimInput {
  league: League
  calendar: Calendar
  calSeed: number
  cards: LCard[]
  /** The booster the player buys and the market supplies. */
  booster?: Booster
  preset: Preset
  years: number
  seed: number
  startMoney?: number
}

export interface SimRow {
  week: number
  money: number
  rating: number
  /** Points over all tracks. */
  points: number
  /** Cards the player owns (not distinct). */
  collection: number
  banned: number
  released: number
  /** The player's best place this week (0: not in a tournament). */
  place: number
  prize: number
  /** The average and the highest price in the market. */
  avgPrice: number
  maxPrice: number
}

export interface SimResult {
  rows: SimRow[]
  entered: number
  wins: number
  bestPlace: number
  world: WorldState
  /** Cards the top decks use most at the end (percent), with the next ban the rules would make. */
  watch: { id: string; name: string; share: number }[]
  nextBan: string[]
}

export function simulateSeason(input: SimInput, onProgress?: (part: number) => void): SimResult {
  const { league, calendar, cards, preset } = input
  const rng = makeRng(input.seed)
  const year = sizes(calendar).year
  const weeks = Math.max(1, Math.round(input.years * year))
  let w: WorldState = emptyWorld(rng.seed(), preset.rating ?? league.playerRating, league.names.regions[0] ?? '')
  w.duelists = startingDuelists(league, rng, cards)
  let money = input.startMoney ?? 0
  let owned = 0
  let entered = 0
  let wins = 0
  let best = 0
  const rows: SimRow[] = []
  const price = input.booster?.price ?? 0

  for (let week = 0; week < weeks; week++) {
    // Income, and boosters bought as far as the money goes.
    money += preset.income
    const affordable = price > 0 ? Math.floor(money / price) : preset.boosters
    const bought = input.booster ? Math.max(0, Math.min(preset.boosters, affordable)) : 0
    money -= bought * price
    owned += bought * (input.booster?.size ?? 0)

    const steps = eventsOn(calendar, week, input.calSeed).flatMap((e) => e.steps)
    // Releases and bans the calendar's events would trigger.
    for (const a of effectsIn(steps, 'release.run')) {
      const def = league.releases.find((r) => r.id === a.release)
      if (!def) continue
      const drawn = drawRelease(def, cards, w.released, rng)
      w = {
        ...w,
        released: [...w.released, ...drawn.filter((c) => !w.released.includes(c))],
        releaseLog: [...w.releaseLog, { week, release: def.id, name: def.name, cards: drawn }],
      }
    }
    for (const a of effectsIn(steps, 'ban.update')) {
      if (!league.bans.enabled) break
      const add = nextBans(league, w)
      const remove = a.lift === 'lift' ? [...w.banned] : []
      if (add.length || remove.length)
        w = { ...w, pendingBan: { week: week + Math.max(0, league.bans.announceWeeks), add, remove } }
    }

    // The player's tournaments.
    let place = 0
    let prize = 0
    const usable = inCirculation(w, cards)
    for (const a of effectsIn(steps, 'tournament.run')) {
      const def = league.tournaments.find((t) => t.id === a.tournament)
      if (!def || w.ran[def.id] === week) continue
      if (!entryFor(def, w, week).ok || !rng.chance(preset.entryChance)) continue
      const field = buildField(def, league, w, Math.max(1, def.players - 1), rng, usable)
      const t = settleAll(createFor(def, contendersOf(field.world, [PLAYER, ...field.ids]), rng.seed()))
      const out = finishTourney(def, league, field.world, t, week)
      w = out.world
      entered++
      if (out.place === 1) wins++
      if (out.place && (!best || out.place < best)) best = out.place
      if (out.place && (!place || out.place < place)) place = out.place
      prize += out.prize
      money += out.prize
    }

    // The world's week: everyone else plays, prices and stock move.
    w = stepWeek({
      world: w,
      league,
      calendar,
      calSeed: input.calSeed,
      cards,
      week,
      booster: input.booster,
    }).world

    const prices = Object.entries(w.prices)
      .filter(([k]) => !k.endsWith('*'))
      .map(([, v]) => v)
    rows.push({
      week,
      money: Math.round(money),
      rating: w.rating,
      points: Object.values(w.points).reduce((n, v) => n + v, 0),
      collection: owned,
      banned: w.banned.length,
      released: w.released.length || cards.length,
      place,
      prize,
      avgPrice: prices.length ? prices.reduce((n, v) => n + v, 0) / prices.length : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    })
    if (onProgress && week % 13 === 0) onProgress((week + 1) / weeks)
  }
  const nameOf = (id: string) => cards.find((c) => c.id === id)?.name ?? id
  const watch = Object.entries(w.usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, share]) => ({ id, name: nameOf(id), share }))
  return { rows, entered, wins, bestPlace: best, world: w, watch, nextBan: nextBans(league, w) }
}
