import { describe, expect, it } from 'vitest'
import type { PackCard } from '@/playtest/pack'
import { autoAce } from './autoAce'

const card = (fields: Record<string, string>) =>
  ({ id: 'x', name: 'x', fields }) as unknown as PackCard
const none = { aceField: '', aceText: '' }

describe('auto Ace setting', () => {
  it('fills in the Adventure Scuffle! Ace marker when the game has none', () => {
    expect(autoAce(none, [card({ Name_AS: 'Foo {ace}', Fate_AS: '1' })])).toEqual({
      aceField: 'Name_AS',
      aceText: '{ace}',
    })
  })

  it('leaves a game that already has a setting alone', () => {
    expect(
      autoAce({ aceField: 'Rarity', aceText: '' }, [card({ Name_AS: 'x', Fate_AS: '1' })]),
    ).toBeNull()
    expect(
      autoAce({ aceField: '', aceText: 'Ace' }, [card({ Name_AS: 'x', Fate_AS: '1' })]),
    ).toBeNull()
  })

  it('leaves other card sets alone', () => {
    expect(autoAce(none, [card({ Title: 'x' })])).toBeNull()
    expect(autoAce(none, [card({ Fate_AS: '1' })])).toBeNull()
  })
})
