import { describe, expect, it } from 'vitest'
import { normalize, readText } from './reader'

describe('the card reader', () => {
  it('reads symbols, curly quotes and the ability label', () => {
    expect(
      normalize('Flip Ability:  Swap the target opponent’s card. +1 {fightingspirit_as}'),
    ).toBe("swap the target opponent's card. +1 fs")
  })

  it('reads conditions and amounts it was never shown as a whole', () => {
    // Not a First Quest card: the same phrases, in a new combination.
    const r = readText('Battle', 'Defending Side, 4+ Rest Zone: +2 {fightingspirit_as}.')
    expect(r.unread).toEqual([])
    expect(r.rules?.fs).toBeTypeOf('function')
    const r2 = readText(
      'Inherent',
      'Flank: +2 {defense_as}. If a Grave card is in your rest zone: +1 {attack_as}.',
    )
    expect(r2.unread).toEqual([])
    expect(r2.rules?.stat).toBeTypeOf('function')
  })

  it('gives a Support card a cost and once per round', () => {
    const r = readText(
      'Support',
      'Once per round, Rest 1: Opponent rests a card from their Support. This card is not rested after use.',
    )
    expect(r.unread).toEqual([])
    expect(r.rules?.support?.name).toBe('Rest 1: Opponent rests a Support card')
    expect(r.rules?.support?.keep).toBeTypeOf('function')
  })

  it('reads a swap by where the card is (Support, or Fighting Spirit)', () => {
    const text = "You may swap this card's position with a ready card on your field."
    expect(readText('Battle', text).rules?.battle?.name).toBe(
      'Swap with a ready card on your field',
    )
    expect(readText('Support', text).rules?.support?.name).toBe(
      'Take the place of a card on your field',
    )
  })

  it('leaves a card it cannot fully read to its stats, and says which words', () => {
    const r = readText('Field', 'Draw a card. Opponent rests a card from their Support.')
    expect(r.rules).toBeNull()
    expect(r.unread).toEqual(['draw a card'])
    // An unknown condition stays unread too.
    expect(readText('Battle', 'Full moon: +1 {fightingspirit_as}.').unread).toEqual([
      'full moon: +1 fs',
    ])
  })

  it('needs an action to fit the card type', () => {
    // An Inherent card has no way to use an action.
    expect(readText('Inherent', 'Opponent rests a card from their Support.').rules).toBeNull()
    // A cost only on abilities a player chooses to use.
    expect(readText('Flip', 'Rest 1: Opponent rests a card from their Support.').rules).toBeNull()
  })

  it('reads a card with no ability as nothing to do', () => {
    expect(readText('Field', '')).toEqual({ rules: {}, unread: [] })
  })
})
