import { beforeEach, describe, expect, it } from 'vitest'
import { blockAt, cellKey, newMapDoc } from '../model/map'
import { useEngine } from './engineStore'

describe('engine store', () => {
  beforeEach(() => useEngine.getState().setMap(newMapDoc('t', { x: 4, z: 4 })))

  it('commits an edit and can undo/redo it', () => {
    const place = () =>
      useEngine.getState().commit((m) => {
        m.blocks[cellKey({ x: 1, y: 0, z: 1 })] = { type: 'stone' }
      })
    place()
    expect(blockAt(useEngine.getState().map, { x: 1, y: 0, z: 1 })?.type).toBe('stone')
    expect(useEngine.getState().canUndo).toBe(true)

    useEngine.getState().undo()
    expect(blockAt(useEngine.getState().map, { x: 1, y: 0, z: 1 })).toBeUndefined()
    expect(useEngine.getState().canRedo).toBe(true)

    useEngine.getState().redo()
    expect(blockAt(useEngine.getState().map, { x: 1, y: 0, z: 1 })?.type).toBe('stone')
  })

  it('a no-op recipe records no undo step', () => {
    useEngine.getState().commit(() => {})
    expect(useEngine.getState().canUndo).toBe(false)
  })

  it('setMap replaces the map and clears history', () => {
    useEngine.getState().commit((m) => {
      m.blocks[cellKey({ x: 0, y: 0, z: 0 })] = { type: 'grass' }
    })
    useEngine.getState().setMap(newMapDoc('fresh'))
    expect(useEngine.getState().map.name).toBe('fresh')
    expect(useEngine.getState().canUndo).toBe(false)
  })
})
