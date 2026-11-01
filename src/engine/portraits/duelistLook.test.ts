import { describe, expect, it } from 'vitest'
import { makeRng } from '../league/rng'
import { generateCharacter, newLayer, newOption, type PortraitTemplate } from '../model/characters'
import { hashSeed, lookOf } from './duelistLook'

const template = (): PortraitTemplate => {
  const hair = { ...newLayer('Hair'), palette: ['#111111', '#aa5500'], required: false }
  hair.options = [newOption('Short'), newOption('Long')]
  const skin = { ...newLayer('Skin'), palette: ['#f1c27d', '#8d5524'] }
  skin.options = [newOption('A'), newOption('B'), newOption('C')]
  const eyes = { ...newLayer('Eyes', 'none'), palette: ['#ff0000'] }
  eyes.options = [newOption('Round')]
  return { id: 't', name: 'T', width: 8, height: 8, layers: [skin, eyes, hair], expressions: [] }
}

describe('generated characters', () => {
  it('the same stream makes the same person', () => {
    const t = template()
    const a = generateCharacter(t, makeRng(5), 'X', 'id')
    const b = generateCharacter(t, makeRng(5), 'X', 'id')
    expect(a).toEqual(b)
  })

  it('picks options and palette colours; layers that are not recoloured keep theirs', () => {
    const t = template()
    for (let s = 0; s < 20; s++) {
      const c = generateCharacter(t, makeRng(s), 'X')
      const [skin, eyes, hair] = t.layers
      expect(skin.options.map((o) => o.id)).toContain(c.parts[skin.id].option)
      expect(skin.palette).toContain(c.parts[skin.id].color)
      expect(c.parts[eyes.id].color).toBe(eyes.color)
      const h = c.parts[hair.id]
      expect(h.option === null || hair.options.some((o) => o.id === h.option)).toBe(true)
    }
  })

  it('a duelist always looks the same, and uses a linked character when there is one', () => {
    const t = template()
    const game = { portraits: [t], characters: [] as never[] }
    const d = { id: 'd1', name: 'Ann', character: null }
    expect(lookOf(game, d)?.character.parts).toEqual(lookOf(game, d)?.character.parts)
    expect(lookOf({ portraits: [], characters: [] }, d)).toBeNull()
    const linked = generateCharacter(t, makeRng(1), 'Boss', 'boss')
    const look = lookOf({ portraits: [t], characters: [linked] }, { ...d, character: 'boss' })
    expect(look?.character.id).toBe('boss')
  })

  it('hashes text to the same number each time', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'))
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'))
  })
})
