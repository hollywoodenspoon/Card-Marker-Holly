import { describe, expect, it } from 'vitest'
import type { PackCard } from '@/playtest/pack'
import { cardsFromPack, isAdventurePack } from './cards'
import { checkDeck } from './deck'

const card = (i: number, fields: PackCard['fields']): PackCard => ({
  id: `c${i}`,
  name: `Card ${i}`,
  w: 63,
  h: 88,
  fields,
  front: 'f.jpg',
  back: null,
})
const as = (i: number, extra: PackCard['fields'] = {}) =>
  card(i, {
    Name_AS: `Hero ${i}`,
    Code_AS: `TFQ-${String(i).padStart(2, '0')}`,
    Type_AS: 'Field',
    FS_AS: 1,
    A_AS: '2',
    D_AS: 3,
    Fate_AS: 100 + i,
    Ability_AS: 'Center: +1 {defense_as}.',
    Deck_AS: 'Guild',
    ...extra,
  })

describe('reading Adventure Scuffle cards', () => {
  it('reads Archetype_AS as a list, empty when absent', () => {
    expect(cardsFromPack([as(1)]).cards[0].archetypes).toEqual([])
    expect(
      cardsFromPack([as(1, { Archetype_AS: 'Rianz, Hero; Knight' })]).cards[0].archetypes,
    ).toEqual(['Rianz', 'Hero', 'Knight'])
  })

  it('reads stats, the code and the group, with numbers from text or icon rows', () => {
    const { cards, issues } = cardsFromPack([as(1)])
    expect(issues).toEqual([])
    expect(cards[0]).toMatchObject({
      code: 'TFQ-01',
      name: 'Hero 1',
      ace: false,
      type: 'Field',
      fs: 1,
      a: 2,
      d: 3,
      fate: 101,
      group: 'Guild',
    })
  })

  it('marks Aces by {ace} in the name and shows the name without it', () => {
    const { cards } = cardsFromPack([as(1, { Name_AS: 'Crimson Duelist {ace}' })])
    expect(cards[0]).toMatchObject({ ace: true, name: 'Crimson Duelist' })
  })

  it('lists missing stats, bad types, out-of-range values and shared Fate Numbers', () => {
    const { issues } = cardsFromPack([
      as(1, { A_AS: '' }),
      as(2, { Type_AS: 'Spell', FS_AS: 5 }),
      as(3, { Fate_AS: 104 }),
      as(4),
    ])
    const text = issues.map((i) => `${i.name}: ${i.problem}`)
    expect(text).toContain('Hero 1: Attack (A_AS) is missing or not a number.')
    expect(text).toContain('Hero 2: Unknown card type "Spell".')
    expect(text).toContain('Hero 2: Fighting Spirit 5 is outside 0–3.')
    expect(text).toContain('Hero 3: Fate Number 104 is also used by Hero 4.')
  })

  it('tells Adventure Scuffle packs from other packs', () => {
    expect(isAdventurePack([as(1)])).toBe(true)
    expect(isAdventurePack([card(1, { Title: 'x' })])).toBe(false)
  })
})

describe('Free Company rules', () => {
  const { cards } = cardsFromPack([
    ...Array.from({ length: 13 }, (_, i) => as(i + 1)),
    as(20, { Name_AS: 'Ace A {ace}' }),
    as(21, { Name_AS: 'Ace B {ace}' }),
  ])
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i + 1}`)

  it('accepts 12 different cards with one Ace', () => {
    expect(checkDeck([...ids(11), 'c20'], byId)).toMatchObject({ ok: true, aces: 1 })
  })

  it('needs exactly 12 cards, one copy each and at most one Ace', () => {
    expect(checkDeck(ids(10), byId).problems).toEqual([
      '2 more cards needed (a Free Company has 12).',
    ])
    expect(checkDeck(ids(13), byId).problems).toEqual(['1 card too many (a Free Company has 12).'])
    expect(checkDeck([...ids(11), 'c1'], byId).problems).toEqual([
      'Hero 1 is in the deck more than once (one copy each).',
    ])
    expect(checkDeck([...ids(10), 'c20', 'c21'], byId).problems).toEqual([
      '2 Aces; a Free Company may have at most 1.',
    ])
  })
})

describe('ability text', () => {
  it('shows stat symbols as letters', async () => {
    const { abilityText } = await import('./cards')
    expect(abilityText('Center: +1 {defense_as}. Flank: +1 {attack_as}.')).toBe(
      'Center: +1 D. Flank: +1 A.',
    )
    expect(abilityText('Heads +2 {fightingspirit_as}, {unknown}')).toBe('Heads +2 FS, {unknown}')
  })
})
