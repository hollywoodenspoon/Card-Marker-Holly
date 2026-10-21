import { describe, expect, it } from 'vitest'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from './fixtures/firstQuest'
import { randomGame } from './fixtures/randomGame'

describe('First Quest self-play', () => {
  const decks = Object.values(FIRST_QUEST_DECKS)
  it('has four legal decks', () => {
    for (const d of decks) {
      expect(d).toHaveLength(12)
      expect(new Set(d).size).toBe(12)
      expect(
        d.filter((id) => FIRST_QUEST.find((c) => c.id === id)!.ace).length,
      ).toBeLessThanOrEqual(1)
    }
  })
  it('plays 200 random games to the end without losing a card', () => {
    let n = 0
    for (let seed = 1; n < 200; seed++)
      for (const a of decks)
        for (const b of decks) {
          if (n >= 200) break
          const { s } = randomGame(a, b, seed * 31 + n)
          expect(s.step.k, `game ${n}`).toBe('over')
          n++
        }
  }, 60_000)
})
