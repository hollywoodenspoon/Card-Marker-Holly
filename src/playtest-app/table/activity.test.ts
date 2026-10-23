import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { createGame } from '@/adventure/engine'
import { basicCards, basicDecks } from '@/adventure/fixtures/basic'
import { recentActions, stepVerb } from './activity'

const game = (lines: string[]) =>
  produce(
    createGame({
      cards: basicCards(),
      decks: basicDecks(),
      names: ['Player 2', 'Player 2 (Hard bot)'],
      seed: 3,
    }),
    (d) => {
      d.log = lines.map((text, i) => ({ n: i + 1, text }))
    },
  )

describe('activity', () => {
  it("shortens each player's own lines, newest first", () => {
    const s = game([
      'Player 2 throws rock, Player 2 (Hard bot) throws paper: Player 2 (Hard bot) wins.',
      "Player 2 (Hard bot) reveals Master Archer (Front Line Left Flank, Fate 139) and Spirited Knight (Front Line Center, Fate 126) on Player 2's field.",
      'Player 2 reveals Mission Handler from their Support: Swap two ready cards on your field.',
      'Player 2 reveals Ghoulish Assassin from the rest zone as Fighting Spirit (+3). Attack 8 vs Defense 7.',
      'Player 2 (Hard bot) has no Support left and passes.',
    ])
    expect(recentActions(s, 0)).toEqual([
      'FS: Ghoulish Assassin +3 (rest zone)',
      'Used Mission Handler',
      'Threw rock',
    ])
    expect(recentActions(s, 1)).toEqual([
      'Passed',
      'Revealed Master Archer, Spirited Knight',
      'Threw paper',
    ])
    expect(recentActions(s, 1, 1)).toEqual(['Passed'])
  })

  it('names the step the player to act is on', () => {
    const s = game([])
    expect(stepVerb(s)).toBe('Placing cards')
  })
})
