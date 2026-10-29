import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { demoMap, tileAt } from '../model/map'
import { AssetStore } from '../storage/assets'
import { EngineDB } from '../storage/db'
import { exportMapFile, MapFileError, parseMapFile, restoreAssets } from './mapFile'

const freshStore = async () => {
  const db = new EngineDB(`mapfile-${Math.random().toString(36).slice(2)}`)
  await db.open()
  return new AssetStore(db)
}

describe('map files', () => {
  it('round-trips a map with a fresh id', async () => {
    const map = demoMap()
    const file = await exportMapFile(map)
    expect(file.version).toBe(2)
    const back = parseMapFile(JSON.stringify(file)).map
    expect(back.id).not.toBe(map.id)
    expect(back.tiles).toEqual(map.tiles)
    expect(back.overhangs).toEqual(map.overhangs)
    expect(back.camera).toEqual(map.camera)
  })

  it('embeds and restores imported tileset images', async () => {
    const store = await freshStore()
    const id = await store.put(
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      'tiles.png',
    )
    const map = demoMap()
    map.tilesets.push({ id: 'ts1', name: 'Mine', tileSize: 32, cols: 4, rows: 4, assetId: id })
    const text = JSON.stringify(await exportMapFile(map, store))

    const other = await freshStore()
    const { map: back, assets } = parseMapFile(text)
    expect(assets).toHaveLength(1)
    await restoreAssets(assets, other)
    const blob = await other.get(back.tilesets[1].assetId!)
    expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('still reads v1 files (loose blocks)', () => {
    const v1 = {
      format: 'hearthside-map',
      version: 1,
      exportedAt: 0,
      map: {
        id: 'a',
        name: 'Old',
        size: { x: 1, z: 1 },
        blocks: { '0,0,0': { type: 'sand' } },
        entities: [],
      },
    }
    const m = parseMapFile(JSON.stringify(v1)).map
    expect(tileAt(m, 0, 0)).toEqual({ type: 'sand', h: 2 })
  })

  it('rejects junk and wrong formats', () => {
    expect(() => parseMapFile('not json')).toThrow(MapFileError)
    expect(() => parseMapFile(JSON.stringify({ format: 'something-else' }))).toThrow(MapFileError)
    expect(() => parseMapFile(JSON.stringify({ format: 'hearthside-map', version: 1 }))).toThrow(
      /missing its map data/,
    )
    expect(() =>
      parseMapFile(JSON.stringify({ format: 'hearthside-map', version: 3, map: {} })),
    ).toThrow(/version/)
  })
})
