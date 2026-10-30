import { describe, expect, it } from 'vitest'
import { PACK_FORMAT, type GamePack } from '@/playtest/pack'
import { mergePacks } from './merge'

const pack = (pid: string, ids: string[], deck: string, w = 63): GamePack => ({
  info: {
    format: PACK_FORMAT,
    version: 1,
    name: pid,
    projectId: pid,
    exportedAt: 5,
    cardSize: { w, h: 88 },
    cards: ids.map((id) => ({
      id,
      name: id,
      w,
      h: 88,
      fields: {},
      front: `images/${id}.jpg`,
      back: null,
    })),
    decks: [{ name: deck, counts: { [ids[0]]: 2 } }],
  },
  images: Object.fromEntries(ids.map((id) => [`images/${id}.jpg`, new Uint8Array([1])])),
})

describe('merging card sources', () => {
  it('joins cards, pictures and decks, marking decks by source', () => {
    const m = mergePacks('g1', 'My game', [
      { key: 'project:a', name: 'Core', pack: pack('a', ['c1', 'c2'], 'Starter') },
      { key: 'pack:b', name: 'Weapons', pack: pack('b', ['w1'], 'Swords', 86) },
    ])
    expect(m.pack.info.projectId).toBe('g1')
    expect(m.pack.info.cards.map((c) => c.id)).toEqual(['c1', 'c2', 'w1'])
    expect(Object.keys(m.pack.images)).toHaveLength(3)
    expect(m.pack.info.decks.map((d) => d.name)).toEqual(['Starter (Core)', 'Swords (Weapons)'])
    expect(m.sourceOf).toEqual({ c1: 'project:a', c2: 'project:a', w1: 'pack:b' })
    expect(m.decks['pack:b'][0].name).toBe('Swords')
    expect(m.pack.info.cardSize.w).toBe(86)
  })

  it('keeps deck names as they are with one source, and the first copy of a shared card', () => {
    const m = mergePacks('g', 'G', [
      { key: 'pack:a', name: 'A', pack: pack('a', ['x'], 'Main') },
      { key: 'pack:b', name: 'B', pack: pack('b', ['x'], 'Other') },
    ])
    expect(m.pack.info.cards).toHaveLength(1)
    expect(m.sourceOf.x).toBe('pack:a')
    expect(
      mergePacks('g', 'G', [{ key: 'pack:a', name: 'A', pack: pack('a', ['x'], 'Main') }]).pack.info
        .decks[0].name,
    ).toBe('Main')
  })
})
