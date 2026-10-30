import { describe, expect, it } from 'vitest'
import { countsOf, deckList, deckSize } from '../model/game'
import { draw, shuffled } from './draw'

const deck = { counts: { a: 2, b: 1, c: 1, d: 3 } }

describe('decks and test draws', () => {
  it('counts copies and lists one entry per copy', () => {
    expect(deckSize(deck)).toBe(7)
    expect(deckList(deck)).toEqual(['a', 'a', 'b', 'c', 'd', 'd', 'd'])
    expect(countsOf(deckList(deck))).toEqual(deck.counts)
  })

  it('draws the same cards from the same seed, and different ones from another', () => {
    const one = draw(shuffled(deck, 42), 5)
    const again = draw(shuffled(deck, 42), 5)
    expect(one.hand).toEqual(again.hand)
    expect(one.hand).toHaveLength(5)
    expect(one.pile).toHaveLength(2)
    expect([...one.hand, ...one.pile].sort()).toEqual(deckList(deck).sort())
    const other = [1, 2, 3, 4, 5].map((s) => draw(shuffled(deck, s), 7).hand.join())
    expect(new Set(other).size).toBeGreaterThan(1)
  })

  it('stops at an empty pile', () => {
    const s = draw(draw(shuffled(deck, 1), 5), 5)
    expect(s.hand).toHaveLength(7)
    expect(s.pile).toEqual([])
  })
})
