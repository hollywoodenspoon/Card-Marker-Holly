import { beforeEach, describe, expect, it } from 'vitest'
import { newMapDoc, tileAt } from '../model/map'
import { raise } from '../tools/edit'
import { useEngine } from './engineStore'

describe('engine store', () => {
  beforeEach(() => useEngine.getState().setMap(newMapDoc('t', { x: 4, z: 4 })))

  it('commits an edit and can undo/redo it', () => {
    useEngine.getState().commit((m) => raise(m, 1, 1, 2, 'stone'))
    expect(tileAt(useEngine.getState().map, 1, 1)!.h).toBe(4)
    expect(useEngine.getState().canUndo).toBe(true)
    useEngine.getState().undo()
    expect(tileAt(useEngine.getState().map, 1, 1)!.h).toBe(2)
    expect(useEngine.getState().canRedo).toBe(true)
    useEngine.getState().redo()
    expect(tileAt(useEngine.getState().map, 1, 1)!.h).toBe(4)
  })

  it('a no-op recipe records no undo step', () => {
    useEngine.getState().commit(() => {})
    expect(useEngine.getState().canUndo).toBe(false)
  })

  it('a drag coalesces into one step until the stroke ends', () => {
    const s = useEngine.getState()
    s.commit((m) => raise(m, 0, 0, 2, 'grass'), 'stroke-a')
    s.commit((m) => raise(m, 1, 0, 2, 'grass'), 'stroke-a')
    s.endStroke()
    s.undo()
    const m = useEngine.getState().map
    expect(tileAt(m, 0, 0)!.h).toBe(2)
    expect(tileAt(m, 1, 0)!.h).toBe(2)
  })

  it('saves the Game camera with the map without an undo step', () => {
    useEngine.getState().setCamera({ fov: 35 })
    expect(useEngine.getState().map.camera.fov).toBe(35)
    expect(useEngine.getState().canUndo).toBe(false)
  })

  it('setMap replaces the map and clears history', () => {
    useEngine.getState().commit((m) => raise(m, 0, 0, 2, 'grass'))
    useEngine.getState().setMap(newMapDoc('fresh'))
    expect(useEngine.getState().map.name).toBe('fresh')
    expect(useEngine.getState().canUndo).toBe(false)
  })
})
