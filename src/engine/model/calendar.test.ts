import { describe, expect, it } from 'vitest'
import {
  dateLabel,
  dateOf,
  defaultCalendar,
  eventsOn,
  isOn,
  known,
  newCalendarEvent,
  upcoming,
  whenLabel,
  type Calendar,
  type CalendarEvent,
} from './calendar'

function ev(name: string, over: Partial<CalendarEvent>): CalendarEvent {
  return { ...newCalendarEvent(name), ...over }
}

/** Adventure Scuffle!'s year: 4 weeks a month, 3 months a season, 4 seasons. */
function scuffle(): Calendar {
  const c = defaultCalendar()
  const locals = ev('Locals', { when: { kind: 'weekly' } })
  const regionals = ev('Regionals', { when: { kind: 'monthWeek', week: 1 }, important: true })
  const nationals = ev('Nationals', {
    when: { kind: 'seasonWeek', week: 3 },
    seasons: [2, 4],
    important: true,
    announce: 4,
  })
  const exam = ev('Exam', {
    when: { kind: 'random', on: 'important', per: 'season', count: 1 },
    seasons: [1, 2, 3],
    mode: 'forced',
  })
  const finalExam = ev('Final exam', {
    when: { kind: 'random', on: nationals.id, per: 'season', count: 1 },
    seasons: [4],
    mode: 'forced',
  })
  c.events.push(locals, regionals, nationals, exam, finalExam)
  return c
}

describe('calendar dates', () => {
  const c = defaultCalendar()
  it('counts weeks into months, seasons and years', () => {
    expect(dateOf(c, 0)).toEqual({
      year: 1,
      season: 1,
      month: 1,
      monthOfSeason: 1,
      week: 1,
      weekOfSeason: 1,
      weekOfYear: 1,
    })
    const d = dateOf(c, 4 * 3 * 4 + 12 + 5) // year 2, season 2, 2nd month, 2nd week
    expect(d).toMatchObject({ year: 2, season: 2, monthOfSeason: 2, week: 2, weekOfSeason: 6 })
    expect(dateLabel(c, 12)).toBe('Week 1 of Summer, year 1')
  })
})

describe('calendar events', () => {
  const c = scuffle()
  const [locals, regionals, nationals, exam, finalExam] = c.events

  it('weekly, Nth week of a month, Nth week of chosen seasons', () => {
    expect(isOn(c, locals, 7, 1)).toBe(true)
    expect([0, 4, 8, 12].every((w) => isOn(c, regionals, w, 1))).toBe(true)
    expect(isOn(c, regionals, 1, 1)).toBe(false)
    // Nationals: week 3 of seasons 2 and 4 only.
    expect(isOn(c, nationals, 2, 1)).toBe(false)
    expect(isOn(c, nationals, 12 + 2, 1)).toBe(true)
    expect(isOn(c, nationals, 36 + 2, 1)).toBe(true)
  })

  it('a random event lands once per season, always on an important event', () => {
    for (const seed of [1, 2, 3, 99]) {
      for (let season = 0; season < 3; season++) {
        const weeks = [...Array(12).keys()].map((k) => season * 12 + k)
        const on = weeks.filter((w) => isOn(c, exam, w, seed))
        expect(on).toHaveLength(1)
        expect(eventsOn(c, on[0], seed).some((e) => e.important)).toBe(true)
      }
      // Season 4: the exam is always on Nationals.
      const s4 = [...Array(12).keys()].map((k) => 36 + k).filter((w) => isOn(c, finalExam, w, seed))
      expect(s4).toEqual([38])
      expect([...Array(12).keys()].some((k) => isOn(c, exam, 36 + k, seed))).toBe(false)
    }
  })

  it('random picks stay the same for a seed, and differ between seeds', () => {
    const pick = (seed: number) => [...Array(12).keys()].find((w) => isOn(c, exam, w, seed))
    expect(pick(5)).toBe(pick(5))
    const all = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(pick))
    expect(all.size).toBeGreaterThan(1)
  })

  it('one-off events, and year limits', () => {
    const end = ev('The end', { when: { kind: 'once', year: 8, week: 1 }, mode: 'auto' })
    const cc = { ...c, events: [...c.events, end] }
    expect(isOn(cc, end, 7 * 48, 1)).toBe(true)
    expect(isOn(cc, end, 7 * 48 + 1, 1)).toBe(false)
    const late = ev('Pro Tour', { when: { kind: 'weekly' }, fromYear: 2 })
    expect(isOn(cc, late, 47, 1)).toBe(false)
    expect(isOn(cc, late, 48, 1)).toBe(true)
  })

  it('the player only knows announced events', () => {
    expect(known(nationals, 14, 9)).toBe(false)
    expect(known(nationals, 14, 10)).toBe(true)
    expect(known(locals, 40, 0)).toBe(true)
    const list = upcoming(c, 0, 1, 16)
    expect(list.some((x) => x.event === nationals)).toBe(false)
    expect(upcoming(c, 10, 1, 8).some((x) => x.event === nationals && x.week === 14)).toBe(true)
  })

  it('describes rules in words', () => {
    expect(whenLabel(c, nationals)).toBe('3rd week of every season (Summer, Winter)')
    expect(whenLabel(c, finalExam)).toBe('1 a season, at random on Nationals (Winter)')
  })
})
