import { describe, expect, it } from 'vitest'
import { ALL_CARDS } from '../fixtures/allCards'
import { readCard } from './reader'

describe('game/adventure-scuffle/cards.csv', () => {
  it('has every card', () => {
    expect(ALL_CARDS.length).toBe(188)
    expect(new Set(ALL_CARDS.map((c) => c.code)).size).toBe(ALL_CARDS.length)
  })

  it('the rules engine reads every card', () => {
    const unread = ALL_CARDS.flatMap((c) => {
      const r = readCard(c)
      return r.unread.length ? [`${c.code} ${c.name}: ${r.unread.join(' | ')}`] : []
    })
    expect(unread).toEqual([])
  })
})
