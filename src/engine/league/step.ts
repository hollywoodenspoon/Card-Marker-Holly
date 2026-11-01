/**
 * The world step: what happens in the world while a week passes. NPC duelists play
 * the tournaments the player didn't enter, ratings drift, old decks are refreshed,
 * card supply and prices move, limited shop stock refills, points fade at the year's
 * end, and a ban that was announced comes into force. Pure and seeded: the same
 * world and week always give the same next world.
 */
import type { Booster } from '../model/economy'
import type { Calendar } from '../model/calendar'
import { sizes } from '../model/calendar'
import type { League } from '../model/league'
import { pickBans, usageOf } from './bans'
import type { LCard } from './cards'
import { npcDeck } from './duelists'
import { priceCards, weeklySupply } from './market'
import { makeRng } from './rng'
import { simulateTourney, tournamentsOn } from './tournaments'
import { inCirculation, type WorldState } from './worldState'

export interface StepInput {
  world: WorldState
  league: League
  calendar: Calendar
  calSeed: number
  cards: LCard[]
  /** The week that is ending. */
  week: number
  /** The booster whose supply drives the market (the market rules' `booster`). */
  booster?: Booster
  /** Limited shop entries as "shopId:entryId" → their stock rule, to refill. */
  stock?: Record<string, { max: number; refill: number }>
  /** Called between parts, for a progress bar (0–1). */
  progress?: (part: number) => void
}

export interface StepResult {
  world: WorldState
  /** Lines of news for the player (a ban in force…): { key, vars } for the game text. */
  news: { key: string; vars: Record<string, string | number> }[]
}

const nameOf = (cards: LCard[], id: string) => cards.find((c) => c.id === id)?.name ?? id

export function stepWeek(input: StepInput): StepResult {
  const { league, calendar, cards, week } = input
  const rng = makeRng(input.world.seed ^ Math.imul(week + 1, 0x9e3779b5))
  let w: WorldState = { ...input.world }
  const news: StepResult['news'] = []
  const report = (p: number) => input.progress?.(p)
  const usable = inCirculation(w, cards)

  // 1. Tournaments the player didn't enter, played by the world.
  for (const id of tournamentsOn(calendar, week, input.calSeed)) {
    const def = league.tournaments.find((t) => t.id === id)
    if (!def || w.ran[id] === week) continue
    w = simulateTourney(def, league, w, week, usable, rng)
  }
  report(0.4)

  // 2. Ratings drift a little; decks refresh (banned cards out, now and then a new deck).
  const drift = Math.max(0, league.weeklyDrift)
  const banned = new Set(w.banned)
  const legal = usable.filter((c) => !banned.has(c.id))
  w.duelists = w.duelists.map((d) => {
    const rating = Math.round(d.rating + (rng() - 0.5) * 2 * drift)
    const stale = d.deck.some((id) => banned.has(id)) || rng.chance(4)
    return { ...d, rating, deck: stale ? npcDeck(legal, league.npcDeckSize, rng) : d.deck }
  })
  report(0.6)

  // 3. A ban that was announced comes into force.
  if (w.pendingBan && w.pendingBan.week <= week + 1) {
    const { add, remove } = w.pendingBan
    const list = [...w.banned.filter((id) => !remove.includes(id)), ...add.filter((id) => !w.banned.includes(id))]
    w = { ...w, banned: list, pendingBan: null, banLog: [...w.banLog, { week: week + 1, add, remove }] }
    if (add.length || remove.length)
      news.push({ key: 'ban.now', vars: { cards: [...add, ...remove].map((id) => nameOf(cards, id)).join(', ') } })
  }

  // 4. The market: more copies come out, use in top decks lifts demand, prices follow.
  w.usage = usageOf(w.results)
  if (league.market.enabled) {
    const add = weeklySupply(league.market, calendar.weeksPerMonth, input.booster, usable)
    const supply = { ...w.supply }
    for (const [id, n] of Object.entries(add)) supply[id] = (supply[id] ?? 0) + n
    w.supply = supply
    w.prices = priceCards(league.market, usable, w.usage, supply)
  }

  // 5. Limited shop stock refills.
  if (input.stock) {
    const stock = { ...w.stock }
    for (const [key, rule] of Object.entries(input.stock))
      stock[key] = Math.min(rule.max, (stock[key] ?? rule.max) + Math.max(0, rule.refill))
    w.stock = stock
  }

  // 6. Points fade at the end of a year.
  const year = sizes(calendar).year
  if ((week + 1) % year === 0 && league.tracks.length) {
    const points = { ...w.points }
    for (const tr of league.tracks)
      if (points[tr.id]) points[tr.id] = Math.round((points[tr.id] * (100 - Math.max(0, tr.yearlyDecay))) / 100)
    w.points = points
  }
  w.lastStep = week + 1
  report(1)
  return { world: w, news }
}

/** The ban an update would announce now, from the world's results and the designer's list. */
export function nextBans(league: League, w: WorldState): string[] {
  return pickBans(league.bans, w.usage, w.banned)
}
