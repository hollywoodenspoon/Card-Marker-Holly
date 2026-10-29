import { describe, expect, it } from 'vitest'
import {
  cellKey,
  cornerHeights,
  demoMap,
  edgeHeights,
  kindOf,
  neighbourEdge,
  newMapDoc,
  parseCellKey,
  setTile,
  sideRef,
  tileAt,
  tileCountOf,
  topRef,
} from './map'
import { BUILTIN, ref } from './tileset'

describe('map model (v2)', () => {
  it('round-trips an overhang cell key', () => {
    const c = { x: 3, y: 1, z: 12 }
    expect(parseCellKey(cellKey(c))).toEqual(c)
  })

  it('a new map is a flat one-step grass field', () => {
    const m = newMapDoc('t', { x: 4, z: 3 })
    expect(m.version).toBe(2)
    expect(m.tiles).toHaveLength(12)
    expect(tileCountOf(m)).toBe(12)
    expect(tileAt(m, 3, 2)).toEqual({ type: 'grass', h: 2 })
    expect(tileAt(m, 4, 0)).toBeNull() // outside the grid
    expect(m.camera.fov).toBe(50)
  })

  it('faces take the override first, then the type default', () => {
    const m = newMapDoc('t', { x: 2, z: 2 })
    const tile = tileAt(m, 0, 0)!
    expect(topRef(m, tile)).toEqual(ref(BUILTIN.grassTop))
    expect(sideRef(m, tile, 'n')).toEqual({
      ref: ref(BUILTIN.grassSide),
      lower: ref(BUILTIN.dirt),
      auto: false,
    })
    tile.top = ref(BUILTIN.sand)
    tile.sides = { e: ref(BUILTIN.wood) }
    expect(topRef(m, tile)).toEqual(ref(BUILTIN.sand))
    expect(sideRef(m, tile, 'e')).toMatchObject({
      ref: ref(BUILTIN.wood),
      lower: ref(BUILTIN.wood),
    })
    expect(sideRef(m, tile, 'w').ref).toEqual(ref(BUILTIN.grassSide))
  })

  it('an auto side mode generates from the top tile', () => {
    const m = newMapDoc('t', { x: 1, z: 1 })
    m.tileTypes[0].sideMode = 'auto'
    const s = sideRef(m, tileAt(m, 0, 0)!, 's')
    expect(s.auto).toBe(true)
    expect(s.ref).toEqual(ref(BUILTIN.grassTop))
  })

  it('slopes lift the corners on their side', () => {
    expect(cornerHeights({ type: 'grass', h: 2 })).toEqual([2, 2, 2, 2])
    expect(cornerHeights({ type: 'grass', h: 2, slope: { dir: 'n', rise: 2 } })).toEqual([
      4, 4, 2, 2,
    ])
    expect(cornerHeights({ type: 'grass', h: 2, slope: { dir: 'e', rise: 1 } })).toEqual([
      2, 3, 3, 2,
    ])
    // The south edge of a north-rising ramp is the low edge.
    expect(edgeHeights({ type: 'grass', h: 2, slope: { dir: 'n', rise: 2 } }, 's')).toEqual([2, 2])
    expect(edgeHeights({ type: 'grass', h: 2, slope: { dir: 'n', rise: 2 } }, 'n')).toEqual([4, 4])
  })

  it('reads the neighbour edge facing a side, in the same order', () => {
    const m = newMapDoc('t', { x: 2, z: 1 })
    setTile(m, 1, 0, { type: 'grass', h: 2, slope: { dir: 'n', rise: 2 } })
    // Tile (0,0)'s east side faces (1,0)'s west edge: [nw, sw] of the ramp = [4, 2],
    // read left→right from outside (0,0)'s east side = [se-side, ne-side] → [2, 4].
    expect(neighbourEdge(m, 0, 0, 'e')).toEqual([2, 4])
    expect(neighbourEdge(m, 0, 0, 'w')).toEqual([0, 0]) // off the grid
  })

  it('kinds come from the type unless the tile overrides', () => {
    const m = newMapDoc('t', { x: 1, z: 1 })
    expect(kindOf(m, { type: 'water', h: 0 })).toBe('water')
    expect(kindOf(m, { type: 'grass', h: 2, kind: 'blocked' })).toBe('blocked')
  })

  it('the demo has a hill, a ramp, a pond and a bridge', () => {
    const m = demoMap()
    expect(tileAt(m, 9, 7)!.h).toBeGreaterThan(4)
    expect(tileAt(m, 9, 10)!.slope).toEqual({ dir: 'n', rise: 1 })
    expect(tileAt(m, 2, 3)!.type).toBe('water')
    expect(Object.keys(m.overhangs).length).toBeGreaterThan(0)
  })
})
