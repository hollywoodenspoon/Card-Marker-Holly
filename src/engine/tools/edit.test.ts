import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { type MapDoc, newMapDoc, setTile, tileAt } from '../model/map'
import { BUILTIN, ref } from '../model/tileset'
import {
  brushCells,
  fillRegion,
  MAX_H,
  paintSide,
  paintTop,
  placeOverhang,
  raise,
  removeOverhang,
  sameTopEverywhere,
  setHeight,
  setKind,
  setSlope,
} from './edit'

const edit = (m: MapDoc, fn: (d: MapDoc) => void) => produce(m, fn)

describe('terrain edits', () => {
  it('raises and lowers by full and half steps, within limits', () => {
    let m = newMapDoc('t', { x: 2, z: 2 })
    m = edit(m, (d) => raise(d, 0, 0, 2, 'grass'))
    expect(tileAt(m, 0, 0)!.h).toBe(4)
    m = edit(m, (d) => raise(d, 0, 0, 1, 'grass'))
    expect(tileAt(m, 0, 0)!.h).toBe(5) // a half step
    m = edit(m, (d) => raise(d, 0, 0, -10, 'grass'))
    expect(tileAt(m, 0, 0)!.h).toBe(0) // never below the ground
    m = edit(m, (d) => raise(d, 0, 0, 999, 'grass'))
    expect(tileAt(m, 0, 0)!.h).toBe(MAX_H)
  })

  it('raising a hole makes a tile; a no-op records nothing', () => {
    let m = newMapDoc('t', { x: 2, z: 1 })
    m = edit(m, (d) => setTile(d, 1, 0, null))
    m = edit(m, (d) => raise(d, 1, 0, 2, 'stone'))
    expect(tileAt(m, 1, 0)).toEqual({ type: 'stone', h: 2 })
    expect(edit(m, (d) => raise(d, 5, 5, 2, 'stone'))).toBe(m)
    expect(edit(m, (d) => setHeight(d, 1, 0, 2, 'stone'))).toBe(m)
  })

  it('sets and clears slopes and kinds', () => {
    let m = newMapDoc('t', { x: 1, z: 1 })
    m = edit(m, (d) => setSlope(d, 0, 0, { dir: 'e', rise: 2 }))
    expect(tileAt(m, 0, 0)!.slope).toEqual({ dir: 'e', rise: 2 })
    m = edit(m, (d) => setSlope(d, 0, 0, undefined))
    expect(tileAt(m, 0, 0)!.slope).toBeUndefined()
    m = edit(m, (d) => setKind(d, 0, 0, 'blocked'))
    expect(tileAt(m, 0, 0)!.kind).toBe('blocked')
    m = edit(m, (d) => setKind(d, 0, 0, 'ground')) // grass's own kind clears the override
    expect(tileAt(m, 0, 0)!.kind).toBeUndefined()
  })

  it('covers a square brush, clipped to the grid', () => {
    const m = newMapDoc('t', { x: 4, z: 4 })
    expect(brushCells(m, 0, 0, 1)).toEqual([[0, 0]])
    expect(brushCells(m, 0, 0, 3)).toHaveLength(4)
    expect(brushCells(m, 2, 2, 3)).toHaveLength(9)
    expect(brushCells(m, 2, 2, 5)).toHaveLength(16)
  })

  it('places and removes overhang blocks', () => {
    let m = newMapDoc('t', { x: 2, z: 2 })
    m = edit(m, (d) => placeOverhang(d, { x: 1, y: 2, z: 0 }, 'wood'))
    expect(m.overhangs['1,2,0']).toEqual({ type: 'wood' })
    expect(edit(m, (d) => placeOverhang(d, { x: 9, y: 2, z: 0 }, 'wood'))).toBe(m)
    m = edit(m, (d) => removeOverhang(d, { x: 1, y: 2, z: 0 }))
    expect(m.overhangs).toEqual({})
  })
})

describe('paint edits', () => {
  it('overrides one face and leaves the rest', () => {
    let m = newMapDoc('t', { x: 1, z: 1 })
    m = edit(m, (d) => paintSide(d, 0, 0, 'e', ref(BUILTIN.wood)))
    const t = tileAt(m, 0, 0)!
    expect(t.sides).toEqual({ e: ref(BUILTIN.wood) })
    expect(t.top).toBeUndefined()
    m = edit(m, (d) => paintSide(d, 0, 0, 'e', null))
    expect(tileAt(m, 0, 0)!.sides).toBeUndefined()
    m = edit(m, (d) => paintTop(d, 0, 0, ref(BUILTIN.sand)))
    expect(tileAt(m, 0, 0)!.top).toEqual(ref(BUILTIN.sand))
  })

  it('fills connected tiles with the same top, across heights, stopped by others', () => {
    let m = newMapDoc('t', { x: 3, z: 1 })
    m = edit(m, (d) => {
      raise(d, 1, 0, 4, 'grass') // same tile, higher: still connected
      paintTop(d, 2, 0, ref(BUILTIN.sand)) // a different top stops it
    })
    expect(fillRegion(m, 0, 0).sort()).toEqual([
      [0, 0],
      [1, 0],
    ])
  })

  it('finds every tile with the same top for replace-everywhere', () => {
    let m = newMapDoc('t', { x: 3, z: 1 })
    m = edit(m, (d) => paintTop(d, 1, 0, ref(BUILTIN.sand)))
    expect(sameTopEverywhere(m, 0, 0)).toHaveLength(2)
    expect(sameTopEverywhere(m, 1, 0)).toEqual([[1, 0]])
  })
})
