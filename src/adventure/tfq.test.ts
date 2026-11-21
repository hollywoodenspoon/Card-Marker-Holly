import { describe, expect, it } from 'vitest'
import { randomDeck } from './deckgen/values'
import { TFQ_CARDS } from './fixtures/allCards'
import { randomGame } from './fixtures/randomGame'
import { apply, createGame, legalMoves } from './engine'

describe('The First Quest (tfq.csv), Open Skirmish', () => {
  it('plays random games with TFQ decks to the end', () => {
    for (let n = 0; n < 60; n++) {
      const [a] = randomDeck(TFQ_CARDS, n * 2 + 1)
      const [b] = randomDeck(TFQ_CARDS, n * 2 + 2)
      const { s } = randomGame(a, b, n * 17 + 3, undefined, 'open', TFQ_CARDS)
      expect(s.step.k, `game ${n}`).toBe('over')
    }
  }, 120_000)

  it("Ghoulish Disruptor's swap is used from the rest zone, not the field", () => {
    const d = TFQ_CARDS.find((c) => c.name === 'Ghoulish Disruptor')!.id
    for (let n = 0; n < 40; n++) {
      const [a] = randomDeck(TFQ_CARDS, n + 500)
      if (!a.includes(d)) continue
      let s = createGame({
        cards: TFQ_CARDS,
        decks: [a, a],
        names: ['A', 'B'],
        seed: n,
        mode: 'open',
      })
      for (let k = 0; k < 600 && s.step.k !== 'over'; k++) {
        const moves = legalMoves(s)
        for (const seat of [0, 1] as const)
          if (s.players[seat].field.some((f) => f.card === d))
            expect(moves.some((m) => m.t === 'ability' && m.card === d && m.window)).toBe(false)
        s = apply(s, moves[(k * 7 + n) % moves.length])
      }
    }
  }, 60_000)
})
