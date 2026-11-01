/**
 * Time in weeks: no days, no day and night. A game sets how many weeks make a
 * month, months a season and seasons a year. Each week the player picks one
 * activity. Calendar events happen on weeks by a rule (every week, the Nth week
 * of a month or season, once, or at random on an important event), and the player
 * only learns of some of them a few weeks ahead. Pure data and date maths, no UI.
 *
 * Weeks are counted from 0 (the first week of the game). Shown dates are 1-based.
 */
import { newId } from '@/core/model/ids'
import type { Condition, Step } from './events'
import type { ImageRef } from './game'

export interface Activity {
  id: string
  name: string
  description: string
  image: ImageRef | null
  /** Can't be picked while this holds ("grounded"). */
  lock: Condition | null
  /** Shown on a locked activity. */
  lockText: string
  /** The only choice while this holds ("exam week"). */
  force: Condition | null
  steps: Step[]
}

export type When =
  | { kind: 'weekly' }
  /** The Nth week of every month. */
  | { kind: 'monthWeek'; week: number }
  /** The Nth week of every season. */
  | { kind: 'seasonWeek'; week: number }
  /** One week: year and week of that year (both from 1). */
  | { kind: 'once'; year: number; week: number }
  /** `count` weeks per month/season/year, picked at random among the weeks another event is on. */
  | {
      kind: 'random'
      /** 'important' = any event marked important; otherwise an event's id. */
      on: string
      per: 'month' | 'season' | 'year'
      count: number
    }

/**
 * What happens on the week:
 * - auto: its steps run when the week starts;
 * - activity: it's one of the week's activities (its steps run if picked);
 * - forced: it's the week's only activity.
 */
export type EventMode = 'auto' | 'activity' | 'forced'

export interface CalendarEvent {
  id: string
  name: string
  description: string
  image: ImageRef | null
  when: When
  /** Only in these seasons of the year (from 1). Empty: every season. */
  seasons: number[]
  /** Only from / until these years (from 1). */
  fromYear: number | null
  toYear: number | null
  /** Weeks ahead the player learns of it. null: always known. 0: only on the week itself. */
  announce: number | null
  /** Random events can land on important ones (exams on tournaments). */
  important: boolean
  mode: EventMode
  lock: Condition | null
  lockText: string
  steps: Step[]
}

export interface Calendar {
  weeksPerMonth: number
  monthsPerSeason: number
  seasonsPerYear: number
  /** Names by index (months of the year, seasons of the year). Missing: "Month 3". */
  monthNames: string[]
  seasonNames: string[]
  activities: Activity[]
  events: CalendarEvent[]
}

export const defaultCalendar = (): Calendar => ({
  weeksPerMonth: 4,
  monthsPerSeason: 3,
  seasonsPerYear: 4,
  monthNames: [],
  seasonNames: ['Spring', 'Summer', 'Autumn', 'Winter'],
  activities: [],
  events: [],
})

export const newActivity = (name: string): Activity => ({
  id: newId(),
  name,
  description: '',
  image: null,
  lock: null,
  lockText: '',
  force: null,
  steps: [],
})

export const newCalendarEvent = (name: string): CalendarEvent => ({
  id: newId(),
  name,
  description: '',
  image: null,
  when: { kind: 'weekly' },
  seasons: [],
  fromYear: null,
  toYear: null,
  announce: null,
  important: false,
  mode: 'activity',
  lock: null,
  lockText: '',
  steps: [],
})

// ---------- dates ----------

export interface CalDate {
  /** All from 1. */
  year: number
  /** Season of the year. */
  season: number
  /** Month of the year, and of the season. */
  month: number
  monthOfSeason: number
  /** Week of the month, of the season and of the year. */
  week: number
  weekOfSeason: number
  weekOfYear: number
}

const pos = (n: number) => Math.max(1, Math.floor(n) || 1)

export function sizes(c: Calendar) {
  const wm = pos(c.weeksPerMonth)
  const ws = wm * pos(c.monthsPerSeason)
  const wy = ws * pos(c.seasonsPerYear)
  return { month: wm, season: ws, year: wy }
}

export function dateOf(c: Calendar, w: number): CalDate {
  const s = sizes(c)
  const week = Math.max(0, Math.floor(w))
  const inYear = week % s.year
  const inSeason = inYear % s.season
  return {
    year: Math.floor(week / s.year) + 1,
    season: Math.floor(inYear / s.season) + 1,
    month: Math.floor(inYear / s.month) + 1,
    monthOfSeason: Math.floor(inSeason / s.month) + 1,
    week: (inYear % s.month) + 1,
    weekOfSeason: inSeason + 1,
    weekOfYear: inYear + 1,
  }
}

export const seasonName = (c: Calendar, n: number) => c.seasonNames[n - 1]?.trim() || `Season ${n}`
export const monthName = (c: Calendar, n: number) => c.monthNames[n - 1]?.trim() || `Month ${n}`

/** "Week 2 of Spring, year 1". */
export function dateLabel(c: Calendar, w: number): string {
  const d = dateOf(c, w)
  return `Week ${d.weekOfSeason} of ${seasonName(c, d.season)}, year ${d.year}`
}

// ---------- which events are on which week ----------

/** A small string hash, to give each event and period its own random numbers. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}

/** mulberry32, one number from a seed. */
function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function inRange(c: Calendar, e: CalendarEvent, w: number): boolean {
  const d = dateOf(c, w)
  if (e.seasons.length && !e.seasons.includes(d.season)) return false
  if (e.fromYear !== null && d.year < e.fromYear) return false
  if (e.toYear !== null && d.year > e.toYear) return false
  return true
}

/** Whether a fixed-rule event (not a random one) is on this week. */
function fixedOn(c: Calendar, e: CalendarEvent, w: number): boolean {
  if (!inRange(c, e, w)) return false
  const d = dateOf(c, w)
  switch (e.when.kind) {
    case 'weekly':
      return true
    case 'monthWeek':
      return d.week === e.when.week
    case 'seasonWeek':
      return d.weekOfSeason === e.when.week
    case 'once':
      return d.year === e.when.year && d.weekOfYear === e.when.week
    default:
      return false
  }
}

/** The weeks a random event picks from in one period, and the ones it picks. */
function randomPicks(c: Calendar, e: CalendarEvent, w: number, seed: number): number[] {
  if (e.when.kind !== 'random') return []
  const { on, per } = e.when
  const count = Math.max(0, Math.floor(e.when.count))
  const len = sizes(c)[per]
  const period = Math.floor(Math.max(0, w) / len)
  const start = period * len
  const targets = c.events.filter(
    (x) =>
      x.id !== e.id && x.when.kind !== 'random' && (on === 'important' ? x.important : x.id === on),
  )
  const candidates: number[] = []
  for (let k = start; k < start + len; k++)
    if (inRange(c, e, k) && targets.some((t) => fixedOn(c, t, k))) candidates.push(k)
  // A seeded shuffle, the same for the whole period (so it can be announced ahead).
  let s = (seed ^ hash(`${e.id}:${period}`)) >>> 0
  const pool = candidates.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    s = (s + 0x9e3779b9) >>> 0
    const j = Math.floor(rand(s) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).sort((a, b) => a - b)
}

export function isOn(c: Calendar, e: CalendarEvent, w: number, seed: number): boolean {
  if (e.when.kind === 'random') return randomPicks(c, e, w, seed).includes(w)
  return fixedOn(c, e, w)
}

/** The events on a week, in the calendar's order. */
export function eventsOn(c: Calendar, w: number, seed: number): CalendarEvent[] {
  return c.events.filter((e) => isOn(c, e, w, seed))
}

/** Whether the player knows about an event on week `w` when it's week `now`. */
export const known = (e: CalendarEvent, w: number, now: number) =>
  w >= now && (e.announce === null || w - now <= Math.max(0, e.announce))

/** The events the player knows about, from this week on. */
export function upcoming(
  c: Calendar,
  now: number,
  seed: number,
  weeks = sizes(c).year,
): { week: number; event: CalendarEvent }[] {
  const out: { week: number; event: CalendarEvent }[] = []
  for (let w = now; w < now + weeks; w++)
    for (const e of eventsOn(c, w, seed)) if (known(e, w, now)) out.push({ week: w, event: e })
  return out
}

/** A rule in words, for lists: "3rd week of every season (Summer, Winter)". */
export function whenLabel(c: Calendar, e: CalendarEvent): string {
  const nth = (n: number) =>
    `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`
  const w = e.when
  let s: string
  if (w.kind === 'weekly') s = 'Every week'
  else if (w.kind === 'monthWeek') s = `${nth(w.week)} week of every month`
  else if (w.kind === 'seasonWeek') s = `${nth(w.week)} week of every season`
  else if (w.kind === 'once') s = `Week ${w.week} of year ${w.year}`
  else {
    const target =
      w.on === 'important'
        ? 'an important event'
        : (c.events.find((x) => x.id === w.on)?.name ?? '?')
    s = `${w.count} a ${w.per}, at random on ${target}`
  }
  if (e.seasons.length) s += ` (${e.seasons.map((n) => seasonName(c, n)).join(', ')})`
  return s
}
