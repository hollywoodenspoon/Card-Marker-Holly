import { describe, expect, it } from 'vitest'
import { makeRng } from '../league/rng'
import { emptyWorld } from '../league/worldState'
import { newCharacter } from '../model/characters'
import { newDeck, newGame } from '../model/game'
import { emptyLeague } from '../model/league'
import { opponentOf, playerDeck } from './cardGame'

const cards = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, ace: false, fields: {} }))

function setup() {
  const g = newGame('T')
  const mine = newDeck('Mine', { a: 2 })
  const theirs = newDeck('Theirs', { b: 1, c: 1 })
  g.decks.push(mine, theirs)
  const ch = newCharacter('Rin', null)
  ch.flags = ['rival']
  g.characters.push(ch)
  const decks: Record<string, Record<string, number>> = {
    [mine.id]: { a: 2 },
    [theirs.id]: { b: 1, c: 1 },
  }
  return { g, mine, theirs, ch, decks }
}

describe("the player's deck", () => {
  it('is the deck they edit, else the starting deck, else none', () => {
    const { g, mine, theirs, decks } = setup()
    expect(playerDeck(g, { decks, ownedDecks: [] })).toBeNull()
    g.economy.startingCards = mine.id
    expect(playerDeck(g, { decks, ownedDecks: [] })?.cards).toEqual(['a', 'a'])
    expect(playerDeck(g, { decks, ownedDecks: [theirs.id] })?.id).toBe(theirs.id)
    expect(playerDeck(g, { decks, ownedDecks: ['player-deck'] })?.id).toBe(mine.id)
  })
})

describe("the opponent's deck", () => {
  it('uses the deck picked in the step', () => {
    const { g, theirs, ch, decks } = setup()
    const st = { decks, ownedDecks: [], world: emptyWorld(1, 1000, '') }
    const o = opponentOf(g, st, { deckB: theirs.id, who: ch.id }, cards, makeRng(1))
    expect(o?.cards).toEqual(['b', 'c'])
    expect(o?.name).toBe('Rin')
  })

  it('uses the deck of the character’s duelist when none is picked', () => {
    const { g, ch, decks } = setup()
    const world = emptyWorld(1, 1000, '')
    world.duelists.push({
      id: 'd1',
      name: 'Rin',
      region: '',
      rating: 1000,
      deck: ['c', 'd'],
      flags: ['rival'],
      character: ch.id,
      played: 0,
    })
    const o = opponentOf(g, { decks, ownedDecks: [], world }, { who: ch.id }, cards, makeRng(1))
    expect(o?.cards).toEqual(['c', 'd'])
    expect(o?.created).toBeUndefined()
  })

  it('makes a duelist for the character when the league is on and they have none', () => {
    const { g, ch, decks } = setup()
    g.league = {
      ...emptyLeague(),
      enabled: true,
      levels: [{ id: 'l', name: 'Local', minRating: 0, population: 0, bot: 'easy' }],
      npcDeckSize: 6,
    }
    const world = emptyWorld(1, 1000, '')
    const o = opponentOf(g, { decks, ownedDecks: [], world }, { who: ch.id }, cards, makeRng(3))
    expect(o?.cards).toHaveLength(6)
    expect(o?.created).toMatchObject({ name: 'Rin', character: ch.id, flags: ['rival'] })
  })

  it('has nobody to play when there is no deck, no character and no league', () => {
    const { g, ch, decks } = setup()
    const world = emptyWorld(1, 1000, '')
    const st = { decks, ownedDecks: [], world }
    expect(opponentOf(g, st, {}, cards, makeRng(1))).toBeNull()
    expect(opponentOf(g, st, { who: ch.id }, cards, makeRng(1))).toBeNull()
  })
})
