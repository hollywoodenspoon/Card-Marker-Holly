import { describe, expect, it } from 'vitest'
import { randomDeck } from './deckgen/values'
import { TFQ_CARDS } from './fixtures/allCards'
import { randomGame } from './fixtures/randomGame'

describe('The First Quest (tfq.csv), Open Skirmish', () => {
  it('plays random games with TFQ decks to the end', () => {
    for (let n = 0; n < 60; n++) {
      const [a] = randomDeck(TFQ_CARDS, n * 2 + 1)
      const [b] = randomDeck(TFQ_CARDS, n * 2 + 2)
      const { s } = randomGame(a, b, n * 17 + 3, undefined, 'open', TFQ_CARDS)
      expect(s.step.k, `game ${n}`).toBe('over')
    }
  }, 120_000)
})
