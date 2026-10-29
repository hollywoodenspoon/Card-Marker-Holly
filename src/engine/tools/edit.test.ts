import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { blockAt, type MapDoc, newMapDoc } from '../model/map'
import { columnTop, lowerColumn, paintBlock, placeBlock, raiseColumn, removeBlock } from './edit'

const edit = (map: MapDoc, fn: (m: MapDoc) => void) => produce(map, fn)

describe('edit operations', () => {
  it('places and removes a block, respecting bounds and occupancy', () => {
    let m = newMapDoc('t', { x: 4, z: 4 })
    m = edit(m, (d) => placeBlock(d, { x: 1, y: 0, z: 1 }, 'stone'))
    expect(blockAt(m, { x: 1, y: 0, z: 1 })?.type).toBe('stone')
    // Out of bounds and double-place are no-ops.
    const same = edit(m, (d) => placeBlock(d, { x: 9, y: 0, z: 0 }, 'stone'))
    expect(same).toBe(m)
    const same2 = edit(m, (d) => placeBlock(d, { x: 1, y: 0, z: 1 }, 'grass'))
    expect(same2).toBe(m)
    m = edit(m, (d) => removeBlock(d, { x: 1, y: 0, z: 1 }))
    expect(blockAt(m, { x: 1, y: 0, z: 1 })).toBeUndefined()
  })

  it('paints only existing blocks', () => {
    let m = newMapDoc('t', { x: 2, z: 2 })
    m = edit(m, (d) => placeBlock(d, { x: 0, y: 0, z: 0 }, 'grass'))
    m = edit(m, (d) => paintBlock(d, { x: 0, y: 0, z: 0 }, 'sand'))
    expect(blockAt(m, { x: 0, y: 0, z: 0 })?.type).toBe('sand')
    const same = edit(m, (d) => paintBlock(d, { x: 1, y: 0, z: 0 }, 'sand'))
    expect(same).toBe(m)
  })

  it('raises and lowers a column by stacking', () => {
    let m = newMapDoc('t', { x: 2, z: 2 })
    expect(columnTop(m, 0, 0)).toBe(-1)
    m = edit(m, (d) => raiseColumn(d, 0, 0, 'earth'))
    m = edit(m, (d) => raiseColumn(d, 0, 0, 'grass'))
    expect(columnTop(m, 0, 0)).toBe(1)
    expect(blockAt(m, { x: 0, y: 1, z: 0 })?.type).toBe('grass')
    m = edit(m, (d) => lowerColumn(d, 0, 0))
    expect(columnTop(m, 0, 0)).toBe(0)
  })
})
