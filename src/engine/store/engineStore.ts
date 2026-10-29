/**
 * The engine editor store: the open map plus undo/redo, built on the same
 * immer-snapshot pattern as the card editor (src/core/editor/editorStore.ts)
 * and the shared History class. `commit(recipe)` is the one way to change the
 * map, so every edit is undoable and the viewport can react to a single
 * `map` reference.
 */
import { produce } from 'immer'
import { create } from 'zustand'
import { History } from '@/core/history/history'
import { type Cell, demoMap, type MapDoc } from '../model/map'

const history = new History<MapDoc>()

/** The editing tool. `select` inspects; the others change the map. Camera orbit is always right/middle-drag. */
export type Tool = 'select' | 'terrain' | 'paint' | 'tile'

export interface EngineState {
  map: MapDoc
  canUndo: boolean
  canRedo: boolean
  /** Current tool. */
  tool: Tool
  /** The palette block type the terrain/paint/tile tools apply. */
  brush: string
  /** The inspected cell (select tool), or null. */
  selection: Cell | null
  /** Apply an immer recipe to the map as one undo step (same key within ~1.5s coalesces). */
  commit: (recipe: (map: MapDoc) => void, coalesceKey?: string) => void
  /** End the current drag-stroke so the next edit starts a new undo step. */
  endStroke: () => void
  /** Replace the whole map (new/open/import); clears history. */
  setMap: (map: MapDoc) => void
  setTool: (tool: Tool) => void
  setBrush: (brush: string) => void
  setSelection: (selection: Cell | null) => void
  /** Rename the open map (metadata, not an undo step). */
  setName: (name: string) => void
  undo: () => void
  redo: () => void
}

export const useEngine = create<EngineState>((set, get) => ({
  map: demoMap(),
  canUndo: false,
  canRedo: false,
  tool: 'terrain',
  brush: 'grass',
  selection: null,
  setTool: (tool) => set({ tool, selection: tool === 'select' ? get().selection : null }),
  setBrush: (brush) => set({ brush }),
  setSelection: (selection) => set({ selection }),
  setName: (name) => set({ map: { ...get().map, name } }),
  commit: (recipe, coalesceKey) => {
    const before = get().map
    const next = produce(before, recipe)
    if (next === before) return
    history.record(before, coalesceKey)
    set({ map: next, canUndo: history.canUndo, canRedo: history.canRedo })
  },
  setMap: (map) => {
    history.clear()
    set({ map, canUndo: false, canRedo: false, selection: null })
  },
  endStroke: () => history.breakCoalescing(),
  undo: () => {
    const prev = history.undo(get().map)
    if (prev) set({ map: prev, canUndo: history.canUndo, canRedo: history.canRedo })
  },
  redo: () => {
    const next = history.redo(get().map)
    if (next) set({ map: next, canUndo: history.canUndo, canRedo: history.canRedo })
  },
}))
