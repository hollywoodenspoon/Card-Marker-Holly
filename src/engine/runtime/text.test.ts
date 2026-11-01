import { describe, expect, it } from 'vitest'
import { defaultCalendar } from '../model/calendar'
import { newVariable } from '../model/game'
import { fillText } from './text'

describe('variables in text', () => {
  const gold = newVariable('Gold', 'number')
  const met = newVariable('Met Ana', 'flag')
  it('fills numbers and flags by name, any case', () => {
    expect(fillText('You have {gold} coins. Met: {Met Ana}', [gold, met], { [gold.id]: 12 })).toBe(
      'You have 12 coins. Met: no',
    )
  })
  it('leaves unknown names and fills the date', () => {
    const cal = { calendar: defaultCalendar(), week: 13 }
    expect(fillText('{fire} {date} · {season} {year}', [], {}, cal)).toBe(
      '{fire} Week 2 of Summer, year 1 · Summer 1',
    )
  })
})
