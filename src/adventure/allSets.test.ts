import { describe, expect, it } from 'vitest'
import { tricksMove } from './bot'
import { quickMove } from './bot/policies'
import { checkGame } from './check'
import { randomDeck } from './deckgen/values'
import { apply, createGame, legalMoves, type Move, type NewGame } from './engine'
import { ALL_CARDS } from './fixtures/allCards'

/**
 * Every card in game/adventure-scuffle/cards.csv in play: random legal decks,
 * bots on both sides, and the rules checker on each game (no card lost or
 * doubled, every move legal, the game ends).
 */
function play(seed: number, bot: 'quick' | 'tricks') {
  const [a, s1] = randomDeck(ALL_CARDS, seed)
  const [b] = randomDeck(ALL_CARDS, s1)
  const game: NewGame = { cards: ALL_CARDS, decks: [a, b], names: ['A', 'B'], seed }
  let s = createGame(game)
  const moves: Move[] = []
  const r = { seed: seed ^ 0x5bd1e995 }
  for (let n = 0; n < 3000 && s.step.k !== 'over'; n++) {
    const m = bot === 'quick' ? quickMove(s, r) : tricksMove(s, r)
    const next = apply(s, m)
    expect(next, `seed ${seed} move ${n}: ${JSON.stringify(m)} refused`).not.toBe(s)
    moves.push(m)
    s = next
  }
  return { s, game, moves }
}

describe('all sets in play', () => {
  it('plays 300 bot games with every card, each checked by the rules checker', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { s, game, moves } = play(seed, seed % 5 ? 'quick' : 'tricks')
      expect(s.step.k, `seed ${seed}`).toBe('over')
      expect(
        checkGame(game, moves).problems.map((p) => p.text),
        `seed ${seed}`,
      ).toEqual([])
    }
  }, 240_000)

  it('the new abilities come up', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 300; seed++) {
      const { s } = play(seed, 'quick')
      for (const l of s.log) {
        if (/debuff token/.test(l.text)) seen.add('token')
        if (/Hire\./.test(l.text)) seen.add('hire')
        if (/attaches to/.test(l.text)) seen.add('attach')
        if (/Interpose/.test(l.text)) seen.add('interpose')
        if (/Endure/.test(l.text)) seen.add('endure')
        if (/coin flip/.test(l.text)) seen.add('coin')
      }
    }
    for (const k of ['attach', 'coin', 'endure', 'hire', 'token']) expect(seen.has(k), k).toBe(true)
  }, 240_000)

  it('leaves no move once a game is over', () => {
    const { s } = play(7, 'quick')
    expect(legalMoves(s)).toEqual([])
  })
})
