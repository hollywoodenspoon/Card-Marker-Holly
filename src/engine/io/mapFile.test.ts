import { describe, expect, it } from 'vitest'
import { cellKey, demoMap, newMapDoc } from '../model/map'
import { exportMapFile, importMapFile, MapFileError } from './mapFile'

describe('map files', () => {
  it('round-trips a map, with a fresh id', () => {
    const map = demoMap()
    const file = exportMapFile(map)
    expect(file.format).toBe('hearthside-map')
    const back = importMapFile(JSON.stringify(file))
    expect(back.id).not.toBe(map.id) // importing never clobbers an existing map
    expect(back.name).toBe(map.name)
    expect(back.blocks).toEqual(map.blocks)
    expect(back.palette.blocks.length).toBe(map.palette.blocks.length)
  })

  it('keeps entities and fills a missing palette', () => {
    const map = newMapDoc('t', { x: 2, z: 2 })
    map.blocks[cellKey({ x: 0, y: 0, z: 0 })] = { type: 'grass' }
    map.entities.push({ id: 'e1', kind: 'spawn', at: { x: 0, y: 1, z: 0 } })
    const text = JSON.stringify({ ...exportMapFile(map), map: { ...map, palette: undefined } })
    const back = importMapFile(text)
    expect(back.entities).toHaveLength(1)
    expect(back.palette.blocks.length).toBeGreaterThan(0)
  })

  it('rejects junk and wrong formats', () => {
    expect(() => importMapFile('not json')).toThrow(MapFileError)
    expect(() => importMapFile(JSON.stringify({ format: 'something-else' }))).toThrow(MapFileError)
    expect(() => importMapFile(JSON.stringify({ format: 'hearthside-map', version: 1 }))).toThrow(
      /missing its map data/,
    )
    expect(() =>
      importMapFile(JSON.stringify({ format: 'hearthside-map', version: 2, map: demoMap() })),
    ).toThrow(/version/)
  })
})
