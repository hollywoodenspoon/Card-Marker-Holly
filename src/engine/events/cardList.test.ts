import { describe, expect, it } from 'vitest'
import { expandCardList, formatCardList, parseCardList } from './cardList'

describe('card list', () => {
  it('reads ids and copies, joining repeats', () => {
    expect(parseCardList('a, b*3 ,a')).toEqual([
      { id: 'a', n: 2 },
      { id: 'b', n: 3 },
    ])
  })

  it('ignores blanks and bad counts', () => {
    expect(parseCardList('')).toEqual([])
    expect(parseCardList(undefined)).toEqual([])
    expect(parseCardList(',x*0,y*q')).toEqual([
      { id: 'x', n: 1 },
      { id: 'y', n: 1 },
    ])
  })

  it('writes it back the same way', () => {
    const text = 'a,b*3'
    expect(formatCardList(parseCardList(text))).toBe(text)
  })

  it('lists every copy', () => {
    expect(expandCardList([{ id: 'a', n: 2 }, { id: 'b', n: 1 }])).toEqual(['a', 'a', 'b'])
  })
})
