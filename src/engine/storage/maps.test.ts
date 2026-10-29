import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { newMapDoc } from '../model/map'
import { EngineDB } from './db'
import { MapStore } from './maps'

let store: MapStore

beforeEach(async () => {
  // A fresh, uniquely named DB per test so they don't share rows.
  const db = new EngineDB(`engine-test-${Math.random().toString(36).slice(2)}`)
  await db.open()
  store = new MapStore(db)
})

describe('MapStore', () => {
  it('saves, loads and lists maps newest-first', async () => {
    const a = newMapDoc('A')
    const b = newMapDoc('B')
    await store.save(a)
    await new Promise((r) => setTimeout(r, 2))
    await store.save(b)
    const list = await store.list()
    expect(list.map((m) => m.name)).toEqual(['B', 'A'])
    expect(await store.load(a.id)).toMatchObject({ id: a.id, name: 'A' })
    expect((await store.load(a.id)) as object).not.toHaveProperty('updatedAt')
  })

  it('renames, duplicates and removes', async () => {
    const a = newMapDoc('A')
    await store.save(a)
    await store.rename(a.id, 'Renamed')
    expect((await store.load(a.id))?.name).toBe('Renamed')

    const copy = await store.duplicate(a.id)
    expect(copy?.name).toBe('Renamed (copy)')
    expect(copy?.id).not.toBe(a.id)
    expect(await store.list()).toHaveLength(2)

    await store.remove(a.id)
    expect(await store.load(a.id)).toBeUndefined()
    expect(await store.list()).toHaveLength(1)
  })

  it('tracks the last-open map and clears it on delete', async () => {
    const a = newMapDoc('A')
    await store.save(a)
    await store.setLastOpen(a.id)
    expect(await store.getLastOpen()).toBe(a.id)
    await store.remove(a.id)
    expect(await store.getLastOpen()).toBeUndefined()
  })
})
