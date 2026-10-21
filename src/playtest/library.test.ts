import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { addPack, deleteDeck, listDecks, PlaytestDB, saveDeck } from './library'
import { buildPack } from './pack'

const pack = (name: string, n: number) =>
  buildPack({
    name,
    projectId: 'proj1',
    exportedAt: 1,
    cardSize: { w: 63, h: 88 },
    cards: Array.from({ length: n }, (_, i) => ({
      id: `c${i}`,
      name: `Card ${i}`,
      w: 63,
      h: 88,
      fields: {},
      front: new Uint8Array([i]),
      back: null,
    })),
    decks: [],
  })

describe('pack library', () => {
  it('stores a pack and replaces an older export of the same project', async () => {
    const db = new PlaytestDB('test-playtest')
    await addPack(await pack('Old', 2), db)
    await addPack(await pack('New', 3), db)
    const rows = await db.packs.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'proj1', name: 'New', cardCount: 3 })
    await expect(addPack(new Uint8Array([1, 2, 3]), db)).rejects.toThrow(/not a game pack/)
  })
})

describe('decks built in the Playtest app', () => {
  it('saves, lists per pack (newest first) and deletes decks', async () => {
    const db = new PlaytestDB('test-playtest-decks')
    await saveDeck({ id: 'd1', packId: 'p1', name: 'Guild', cards: ['a', 'b'] }, db)
    await new Promise((r) => setTimeout(r, 2))
    await saveDeck({ id: 'd2', packId: 'p1', name: 'Graves', cards: ['c'] }, db)
    await saveDeck({ id: 'd3', packId: 'p2', name: 'Other', cards: [] }, db)
    expect((await listDecks('p1', db)).map((d) => d.name)).toEqual(['Graves', 'Guild'])
    await deleteDeck('d1', db)
    expect((await listDecks('p1', db)).map((d) => d.id)).toEqual(['d2'])
  })
})
