import { describe, expect, it } from 'vitest'
import {
  blockAt,
  blockCount,
  cellKey,
  defaultPalette,
  demoMap,
  inBounds,
  newMapDoc,
  parseCellKey,
} from './map'

describe('map model', () => {
  it('round-trips a cell key', () => {
    const c = { x: 3, y: 0, z: 12 }
    expect(parseCellKey(cellKey(c))).toEqual(c)
  })

  it('a new map is empty with the default palette', () => {
    const m = newMapDoc()
    expect(blockCount(m)).toBe(0)
    expect(m.entities).toEqual([])
    expect(m.palette.blocks.map((b) => b.id)).toEqual(defaultPalette().map((b) => b.id))
  })

  it('bounds follow the footprint and the ground', () => {
    const m = newMapDoc('t', { x: 4, z: 4 })
    expect(inBounds(m, { x: 0, y: 0, z: 0 })).toBe(true)
    expect(inBounds(m, { x: 3, y: 9, z: 3 })).toBe(true)
    expect(inBounds(m, { x: -1, y: 0, z: 0 })).toBe(false)
    expect(inBounds(m, { x: 4, y: 0, z: 0 })).toBe(false)
    expect(inBounds(m, { x: 0, y: -1, z: 0 })).toBe(false)
  })

  it('the demo map has a ground layer and a hill above it', () => {
    const m = demoMap()
    expect(blockAt(m, { x: 0, y: 0, z: 0 })?.type).toBe('grass')
    // The centre column is raised.
    expect(blockAt(m, { x: 8, y: 1, z: 8 })).toBeDefined()
    expect(blockCount(m)).toBeGreaterThan(m.size.x * m.size.z)
  })
})
