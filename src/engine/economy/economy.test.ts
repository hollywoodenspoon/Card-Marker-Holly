import { describe, expect, it } from 'vitest'
import { isAce, newBooster, type Economy } from '../model/economy'
import { openBooster, pickRarity, rarityPercents } from './booster'
import { addCards, addItems, clampDeck, owned, spare, takeCards } from './collection'

const econ = (over: Partial<Economy> = {}): Economy => ({
  money: null,
  unit: '',
  aceField: 'Name',
  aceText: '{ace}',
  startingCards: null,
  ...over,
})

describe('Ace field', () => {
  it('matches the text in the field, any case', () => {
    expect(isAce({ Name: 'Crimson Duelist {ACE}' }, econ())).toBe(true)
    expect(isAce({ Name: 'Crimson Duelist' }, econ())).toBe(false)
    expect(isAce({ Name: 'x' }, econ({ aceField: '' }))).toBe(false)
  })
  it('with no text, any value but blank, 0, no or false', () => {
    const e = econ({ aceField: 'Ace', aceText: '' })
    expect(isAce({ Ace: 'yes' }, e)).toBe(true)
    expect(isAce({ Ace: 1 }, e)).toBe(true)
    expect(isAce({ Ace: 0 }, e)).toBe(false)
    expect(isAce({ Ace: 'No' }, e)).toBe(false)
    expect(isAce({}, e)).toBe(false)
  })
})

describe('boosters', () => {
  const b = newBooster('Starter')
  const pool = [
    { id: 'a', ace: false },
    { id: 'b', ace: false },
    { id: 'A', ace: true },
  ]

  it('defaults to 3 cards at 70 / 22 / 6 / 2', () => {
    expect(b.size).toBe(3)
    expect(Object.values(rarityPercents(b))).toEqual([70, 22, 6, 2])
  })

  it('picks rarities by their chances', () => {
    expect(pickRarity(b, 0)?.name).toBe('Common')
    expect(pickRarity(b, 0.69)?.name).toBe('Common')
    expect(pickRarity(b, 0.71)?.name).toBe('Uncommon')
    expect(pickRarity(b, 0.93)?.name).toBe('Rare')
    expect(pickRarity(b, 0.99)?.name).toBe('Diamond rare')
  })

  it('opens the same pack from the same seed, with matching Ace and foil', () => {
    const one = openBooster(b, pool, 42)
    expect(openBooster(b, pool, 42)).toEqual(one)
    expect(one.cards).toHaveLength(3)
    for (const c of one.cards) {
      const r = b.rarities.find((x) => x.id === c.rarity)!
      expect(c.foil).toBe(r.foil)
      expect(pool.find((p) => p.id === c.id)!.ace).toBe(r.ace)
    }
  })

  it('rolls close to the chances over many packs', () => {
    const counts: Record<string, number> = {}
    let seed = 1
    for (let i = 0; i < 4000; i++) {
      const r = openBooster(b, pool, seed)
      seed = r.seed
      for (const c of r.cards) counts[c.rarity] = (counts[c.rarity] ?? 0) + 1
    }
    const share = (name: string) => counts[b.rarities.find((x) => x.name === name)!.id] / 12000
    expect(share('Common')).toBeGreaterThan(0.67)
    expect(share('Common')).toBeLessThan(0.73)
    expect(share('Diamond rare')).toBeGreaterThan(0.01)
    expect(share('Diamond rare')).toBeLessThan(0.03)
  })

  it('falls back to any card when the pool has none of a kind', () => {
    const r = openBooster(b, [{ id: 'a', ace: false }], 3)
    expect(r.cards.every((c) => c.id === 'a')).toBe(true)
  })
})

describe('collection and inventory', () => {
  it('counts items, never below zero', () => {
    let inv = addItems({}, 'potion', 2)
    inv = addItems(inv, 'potion', -5)
    expect(inv).toEqual({})
  })

  it('keeps normal and foil copies apart', () => {
    let col = addCards({}, 'a', false, 2)
    col = addCards(col, 'a', true, 1)
    expect(owned(col, 'a')).toBe(3)
    expect(owned(col, 'a', 'foil')).toBe(1)
    expect(owned(col, 'a', 'normal')).toBe(2)
    const t = takeCards(col, 'a', 3)
    expect(t.foil).toBe(1)
    expect(t.col).toEqual({})
  })

  it('spare copies leave out the most any deck uses, and decks stay within what is owned', () => {
    const col = addCards({}, 'a', false, 3)
    expect(spare(col, [{ a: 2 }, { a: 1 }], 'a')).toBe(1)
    expect(clampDeck({ a: 5, b: 1 }, col)).toEqual({ a: 3 })
  })
})
