import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain .mjs build script, without types
import { BANNED, findBanned } from './cozyCheck.mjs'

describe('Cozy string check', () => {
  it('catches each product and platform name', () => {
    for (const word of [
      'Adventure Scuffle',
      'Hearthside Table',
      'Hearthside Engine',
      'Card Maker',
      'github.com',
      'pacman -Syu',
      'Android',
      'Arch Linux',
    ])
      expect(findBanned(`text ${word} more`).length, word).toBeGreaterThan(0)
  })

  it('leaves ordinary card-editor text alone', () => {
    const ok = 'Design a card, add text and art, print an A4 sheet with cut marks.'
    expect(findBanned(ok)).toEqual([])
  })

  it('reports the word and some context', () => {
    const [hit] = findBanned('the Hearthside Table app')
    expect(hit.word).toBe('Hearthside Table')
    expect(hit.context).toContain('app')
  })

  it('has a rule for every banned word', () => {
    expect(BANNED.length).toBeGreaterThanOrEqual(8)
  })
})
