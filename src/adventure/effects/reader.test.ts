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

  it('gives Fighting Spirit only to Battle Abilities', () => {
    // Falconer Knight's dead clause: Inherent Abilities never grant Fighting Spirit.
    expect(
      readText('Inherent', 'If a Falcon card is in your rest zone: +1 {fightingspirit_as}.').unread,
    ).toEqual(['if a falcon card is in your rest zone: +1 fs'])
    expect(readText('Battle', 'Initiative: +1 {fightingspirit_as}.').unread).toEqual([])
  })

  it('reads keyword names whose rule the clause spells out', () => {
    for (const [type, text] of [
      [
        'Battle',
        'Echo Bond: If another Whispering card was already revealed this Engagement: +1 {fightingspirit_as}.',
      ],
      ['Field', 'Attack Override, Rest 2: Non-adjacent cards are counted for attack.'],
    ] as const)
      expect(readText(type, text).unread, text).toEqual([])
  })

  it('no longer reads the retired Kindred names, but reads the same effects in plain text', () => {
    expect(readText('Battle', 'Kindred Strike (Unmade): +2 {fightingspirit_as}.').rules).toBeNull()
    expect(
      readText(
        'Rest',
        'Kindred Return (Unmade): If an Unmade card is also on your field: you may use this card for Fighting Spirit this Engagement. It gets +1 {fightingspirit_as}.',
      ).rules,
    ).toBeNull()
    for (const [type, text] of [
      [
        'Battle',
        'If an Unmade card was revealed as Fighting Spirit this Engagement: +2 {fightingspirit_as}.',
      ],
      [
        'Rest',
        'If an Unmade card is also on your field: You may use this card for Fighting Spirit this Engagement. It gets +1 {fightingspirit_as}.',
      ],
      [
        'Field',
        'Swap the position of an Unmade card on your field (this card included) with another card on your field. To choose a face-down Unmade card, show it to your opponent; it stays face down.',
      ],
    ] as const)
      expect(readText(type, text).unread, text).toEqual([])
  })

  it('reads a condition on a clause that follows one read by another phrase', () => {
    const r = readText(
      'Support',
      "Swap a ready card's position with another ready card on your field. If you have 3 or fewer cards in Support: this card does not need to be rested after use.",
    )
    expect(r.unread).toEqual([])
    expect(r.rules?.support?.keep).toBeTypeOf('function')
  })

  it('reads a card with no ability as nothing to do', () => {
    expect(readText('Field', '')).toEqual({ rules: {}, unread: [] })
  })
})
