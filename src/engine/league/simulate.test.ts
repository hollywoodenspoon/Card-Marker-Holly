import { describe, expect, it } from 'vitest'
import { defaultCalendar, newCalendarEvent, sizes } from '../model/calendar'
import { newBooster } from '../model/economy'
import { effect } from '../model/events'
import { adventureLeague } from '../model/league'
import type { LCard } from './cards'
import { defaultPresets, simulateSeason, type SimInput } from './simulate'

const cards: LCard[] = Array.from({ length: 90 }, (_, i) => ({
  id: `c${i}`,
  name: `Card ${i}`,
  ace: i % 15 === 0,
  fields: { Type: i % 3 === 0 ? 'Fire' : 'Water' },
}))

function setup(): SimInput {
  const league = adventureLeague()
  const cal = defaultCalendar()
  const on = (name: string, e: Partial<ReturnType<typeof newCalendarEvent>>, ...steps: ReturnType<typeof effect>[]) => {
    const ev = { ...newCalendarEvent(name), mode: 'auto' as const, ...e }
    ev.steps.push(...steps)
    cal.events.push(ev)
  }
  const id = (n: string) => league.tournaments.find((t) => t.name === n)!.id
  on('Starter', { when: { kind: 'once', year: 1, week: 1 } }, effect('release.run', { release: league.releases[0]!.id }))
  on('Season set', { when: { kind: 'seasonWeek', week: 1 } }, effect('release.run', { release: league.releases[1]!.id }))
  on('Bans', { when: { kind: 'monthWeek', week: 4 }, fromYear: 2 }, effect('ban.update', { lift: 'keep' }))
  on('Locals', { when: { kind: 'monthWeek', week: 2 } }, effect('tournament.run', { tournament: id('Locals'), deck: 'd', placeVar: '' }))
  on('Nationals', { when: { kind: 'seasonWeek', week: 5 } }, effect('tournament.run', { tournament: id('Nationals'), deck: 'd', placeVar: '' }))
  const booster = newBooster('Pack')
  booster.price = 5
  booster.size = 5
  return {
    league,
    calendar: cal,
    calSeed: 3,
    cards,
    booster,
    preset: defaultPresets()[1]!,
    years: 2,
    seed: 11,
  }
}

describe('the season simulator', () => {
  it('gives one row per week of the game’s own year length', () => {
    const input = setup()
    const r = simulateSeason(input)
    expect(r.rows).toHaveLength(2 * sizes(input.calendar).year)
    expect(r.rows[0]!.week).toBe(0)
  })

  it('is repeatable from a seed and differs with another', () => {
    const a = simulateSeason(setup())
    const b = simulateSeason(setup())
    expect(b.rows).toEqual(a.rows)
    const c = simulateSeason({ ...setup(), seed: 99 })
    expect(c.rows).not.toEqual(a.rows)
  })

  it('money buys boosters, so the collection grows', () => {
    const r = simulateSeason(setup())
    const last = r.rows[r.rows.length - 1]!
    expect(last.collection).toBeGreaterThan(0)
    expect(r.rows.every((x, i) => i === 0 || x.collection >= r.rows[i - 1]!.collection)).toBe(true)
  })

  it('releases put cards out and the player collects points', () => {
    const r = simulateSeason(setup())
    const last = r.rows[r.rows.length - 1]!
    expect(last.released).toBeGreaterThan(0)
    expect(r.entered).toBeGreaterThan(0)
    expect(last.points).toBeGreaterThan(0)
  })

  it('a longer game keeps going', () => {
    const r = simulateSeason({ ...setup(), years: 5 })
    expect(r.rows).toHaveLength(5 * sizes(setup().calendar).year)
  })
})
