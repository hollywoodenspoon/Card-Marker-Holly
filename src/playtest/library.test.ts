import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import {
  addPack,
  deleteDeck,
  deleteReplay,
  listDecks,
  listReplays,
  listRush,
  listSims,
  pinReplay,
  PlaytestDB,
  REPLAYS_KEPT,
  RUSH_KEPT,
  saveDeck,
  saveReplay,
  saveRush,
  saveSim,
  SIMS_KEPT,
} from './library'
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

describe('replays and Rush batches', () => {
  const game = {
    cards: [],
    decks: [[], []] as [string[], string[]],
    names: ['A', 'B'] as [string, string],
    seed: 1,
  }
  const replay = (id: string, packId = 'p1') => ({
    id,
    packId,
    source: 'bot' as const,
    names: ['A', 'B'] as [string, string],
    bots: [null, 'normal'] as ['normal' | null, 'normal' | null],
    winner: 0 as const,
    points: [4, 2] as [number, number],
    rounds: 3,
    game,
    moves: [{ t: 'pass' as const }],
  })

  it('keeps the newest replays and every pinned one', async () => {
    const db = new PlaytestDB('test-playtest-replays')
    await saveReplay({ ...replay('keep'), pinned: true }, db)
    for (let i = 0; i < REPLAYS_KEPT + 3; i++) {
      await saveReplay(replay(`r${i}`), db)
      await new Promise((r) => setTimeout(r, 1))
    }
    const rows = await listReplays('p1', db)
    expect(rows.filter((r) => !r.pinned)).toHaveLength(REPLAYS_KEPT)
    expect(rows.some((r) => r.id === 'keep')).toBe(true)
    expect(rows.some((r) => r.id === 'r0')).toBe(false)
    await pinReplay('r5', true, db)
    await deleteReplay('keep', db)
    expect((await listReplays('p1', db)).filter((r) => r.pinned).map((r) => r.id)).toEqual(['r5'])
    // Saving the same game again (after an undo) keeps the pin.
    await saveReplay(replay('r5'), db)
    expect((await listReplays('p1', db)).find((r) => r.id === 'r5')?.pinned).toBe(true)
  })

  it('keeps the newest Rush batches', async () => {
    const db = new PlaytestDB('test-playtest-rush')
    for (let i = 0; i < RUSH_KEPT + 2; i++) {
      await saveRush(
        {
          id: `b${i}`,
          packId: 'p1',
          savedAt: i,
          decks: [
            { name: 'X', cards: [] },
            { name: 'Y', cards: [] },
          ],
          levels: ['normal', 'normal'],
          games: 0,
          cards: [],
          uses: {},
          matches: [],
        },
        db,
      )
    }
    expect((await listRush('p1', db)).map((r) => r.id)).toEqual(['b6', 'b5', 'b4', 'b3', 'b2'])
  })

  it('keeps the newest Balance lab runs', async () => {
    const db = new PlaytestDB('test-playtest-sims')
    for (let i = 0; i < SIMS_KEPT + 2; i++)
      await saveSim({ id: `s${i}`, packId: 'p1', savedAt: i, result: {} as never, report: '' }, db)
    const kept = (await listSims('p1', db)).map((r) => r.id)
    expect(kept).toHaveLength(SIMS_KEPT)
    expect(kept[0]).toBe(`s${SIMS_KEPT + 1}`)
    expect(kept).not.toContain('s0')
  })

  it('opens a version 2 database and adds the new tables', async () => {
    const old = new Dexie('test-playtest-v2')
    old.version(1).stores({ packs: 'id, importedAt', games: 'packId', setups: 'id' })
    old.version(2).stores({ decks: 'id, packId' })
    await old.open()
    await old.table('decks').put({ id: 'd1', packId: 'p1', name: 'Kept', cards: [], updatedAt: 1 })
    old.close()
    const db = new PlaytestDB('test-playtest-v2')
    expect((await listDecks('p1', db)).map((d) => d.name)).toEqual(['Kept'])
    expect(await listReplays('p1', db)).toEqual([])
  })
})
