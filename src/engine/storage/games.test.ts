import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { newGame, newPictureScene } from '../model/game'
import { newMapDoc } from '../model/map'
import { EngineDB } from './db'
import { GameStore } from './games'
import { MapStore } from './maps'

let db: EngineDB
let games: GameStore
let maps: MapStore

beforeEach(async () => {
  db = new EngineDB(`engine-games-${Math.random().toString(36).slice(2)}`)
  await db.open()
  games = new GameStore(db)
  maps = new MapStore(db)
})

describe('GameStore', () => {
  it('moves existing maps into "My game" on first use, with their card choices as sources', async () => {
    const a = newMapDoc('Hills')
    a.cards = { kind: 'project', id: 'p1', name: 'Scuffle' }
    const b = newMapDoc('Caves')
    b.cards = { kind: 'project', id: 'p1', name: 'Scuffle' }
    await maps.save(a)
    await maps.save(b)
    const g = await games.ensureGame()
    expect(g.name).toBe('My game')
    expect(g.scenes.map((s) => (s.kind === 'map' ? s.mapId : ''))).toEqual(
      expect.arrayContaining([a.id, b.id]),
    )
    expect(g.sources).toEqual([{ kind: 'project', id: 'p1', name: 'Scuffle' }])
    expect(g.startScene).toBe(g.scenes[0].id)
    // Next time it opens the same game, not a new one.
    expect((await games.ensureGame()).id).toBe(g.id)
    expect(await games.list()).toHaveLength(1)
  })

  it('saves, duplicates (with its maps) and removes', async () => {
    const map = newMapDoc('Town')
    await maps.save(map)
    const g = newGame('Card game')
    g.scenes.push({ id: 's1', name: 'Town', kind: 'map', mapId: map.id, events: [] }, newPictureScene('Shop'))
    await games.save(g)
    const copy = (await games.duplicate(g.id))!
    expect(copy.name).toBe('Card game (copy)')
    const copiedMap = copy.scenes.find((s) => s.kind === 'map')!
    expect(copiedMap.kind === 'map' && copiedMap.mapId).not.toBe(map.id)
    await games.remove(g.id)
    expect(await games.load(g.id)).toBeUndefined()
    expect(await db.maps.get(map.id)).toBeUndefined()
    expect(await games.load(copy.id)).toBeDefined()
  })

  it('fills in what an older game lacks', async () => {
    await db.games.put({ id: 'old', name: 'Old', updatedAt: 1 } as never)
    const g = (await games.load('old'))!
    expect(g.decks).toEqual([])
    expect(g.zones.map((z) => z.name)).toEqual(['Hand', 'Discard', 'Removed'])
  })
})
