import { describe, expect, it } from 'vitest'
import { newMapDoc, tileAt } from './map'
import { MapFormatError, migrateMap } from './migrate'

/** A map as the first engine builds saved it. */
const v1 = {
  id: 'old',
  name: 'Old map',
  size: { x: 3, z: 2 },
  blocks: {
    '0,0,0': { type: 'grass' },
    '1,0,0': { type: 'earth' },
    '1,1,0': { type: 'grass' },
    // a gap at y=1, then a floating block: an overhang
    '2,0,1': { type: 'stone' },
    '2,2,1': { type: 'sand' },
    // an unknown type falls back to stone
    '0,0,1': { type: 'marble' },
  },
  entities: [],
  palette: { blocks: [] },
}

describe('migrateMap', () => {
  it('turns v1 stacks into tile columns', () => {
    const m = migrateMap(v1)
    expect(m.version).toBe(2)
    expect(m.id).toBe('old')
    expect(tileAt(m, 0, 0)).toEqual({ type: 'grass', h: 2 })
    expect(tileAt(m, 1, 0)).toEqual({ type: 'grass', h: 4 }) // two blocks, typed by the top one
    expect(tileAt(m, 2, 0)).toBeNull() // no block on the ground there
    expect(tileAt(m, 0, 1)).toEqual({ type: 'stone', h: 2 })
  })

  it('keeps blocks above a gap as overhangs', () => {
    const m = migrateMap(v1)
    expect(tileAt(m, 2, 1)).toEqual({ type: 'stone', h: 2 })
    expect(m.overhangs).toEqual({ '2,2,1': { type: 'sand' } })
  })

  it('tidies a v2 map that lacks newer fields', () => {
    const fresh = newMapDoc('t', { x: 2, z: 2 })
    const partial = { ...fresh, camera: undefined, tilesets: [] }
    const m = migrateMap(partial)
    expect(m.camera.fov).toBe(50)
    expect(m.tilesets[0].id).toBe('builtin')
  })

  it('rejects things that are not maps', () => {
    expect(() => migrateMap(null)).toThrow(MapFormatError)
    expect(() => migrateMap({ name: 'x' })).toThrow(/missing its map data/)
  })
})
