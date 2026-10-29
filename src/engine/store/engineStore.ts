/**
 * The engine editor store: the open map plus undo/redo, built on the same
 * immer-snapshot pattern as the card editor (src/core/editor/editorStore.ts)
 * and the shared History class. `commit(recipe)` is the one way to change the
 * map's content, so every edit is undoable and the viewports react to a single
 * `map` reference. The mode and its options are editor state, not undoable.
 */
import { produce } from 'immer'
import { create } from 'zustand'
import { History } from '@/core/history/history'
import {
  type Cell,
  demoMap,
  type Dir,
  type MapCamera,
  type MapDoc,
  type TileKind,
} from '../model/map'
import { BUILTIN, ref, type TileRef } from '../model/tileset'

const history = new History<MapDoc>()

/** The editing modes from the engine plan (Objects and Play come later). */
export type Mode = 'terrain' | 'paint' | 'tile'

export type TerrainOp = 'raise' | 'lower' | 'flatten' | 'slope' | 'kind' | 'hole' | 'overhang'
export interface TerrainOptions {
  op: TerrainOp
  /** Square brush width in tiles: 1, 3 or 5. */
  size: 1 | 3 | 5
  slopeDir: Dir
  rise: 1 | 2
  kind: TileKind
}

export type PaintTool = 'brush' | 'fill' | 'replace'
export type PaintTarget = 'tops' | 'sides' | 'both'
/** Paint a tile onto faces, set the terrain type, or clear face overrides. */
export type PaintWhat = 'tile' | 'type' | 'clear'
export interface PaintOptions {
  tool: PaintTool
  target: PaintTarget
  what: PaintWhat
  size: 1 | 3 | 5
}

/** The inspected tile (Tile mode), or an overhang block. */
export interface Selection {
  x: number
  z: number
  overhang?: Cell
}

export interface EngineState {
  map: MapDoc
  canUndo: boolean
  canRedo: boolean
  mode: Mode
  terrain: TerrainOptions
  paint: PaintOptions
  /** The tile the Paint tool applies (picked from a tileset). */
  tileBrush: TileRef
  /** The terrain type new tiles and "set type" use. */
  typeBrush: string
  selection: Selection | null
  /** Apply an immer recipe to the map as one undo step (same key within ~1.5s coalesces). */
  commit: (recipe: (map: MapDoc) => void, coalesceKey?: string) => void
  /** End the current drag-stroke so the next edit starts a new undo step. */
  endStroke: () => void
  /** Replace the whole map (new/open/import); clears history. */
  setMap: (map: MapDoc) => void
  setMode: (mode: Mode) => void
  setTerrain: (o: Partial<TerrainOptions>) => void
  setPaint: (o: Partial<PaintOptions>) => void
  setTileBrush: (r: TileRef) => void
  setTypeBrush: (id: string) => void
  setSelection: (selection: Selection | null) => void
  /** Rename the open map (metadata, not an undo step). */
  setName: (name: string) => void
  /** The map's Game camera (FOV, turn, tilt): saved with the map, not an undo step. */
  setCamera: (camera: Partial<MapCamera>) => void
  undo: () => void
  redo: () => void
}

export const useEngine = create<EngineState>((set, get) => ({
  map: demoMap(),
  canUndo: false,
  canRedo: false,
  mode: 'terrain',
  terrain: { op: 'raise', size: 1, slopeDir: 'n', rise: 2, kind: 'water' },
  paint: { tool: 'brush', target: 'tops', what: 'tile', size: 1 },
  tileBrush: ref(BUILTIN.grassTop),
  typeBrush: 'grass',
  selection: null,
  setMode: (mode) => set({ mode, selection: mode === 'tile' ? get().selection : null }),
  setTerrain: (o) => set({ terrain: { ...get().terrain, ...o } }),
  setPaint: (o) => set({ paint: { ...get().paint, ...o } }),
  setTileBrush: (tileBrush) => set({ tileBrush }),
  setTypeBrush: (typeBrush) => set({ typeBrush }),
  setSelection: (selection) => set({ selection }),
  setName: (name) => set({ map: { ...get().map, name } }),
  setCamera: (camera) => {
    const map = get().map
    const next = { ...map.camera, ...camera }
    if (next.fov === map.camera.fov && next.yaw === map.camera.yaw && next.tilt === map.camera.tilt)
      return
    set({ map: { ...map, camera: next } })
  },
  commit: (recipe, coalesceKey) => {
    const before = get().map
    const next = produce(before, recipe)
    if (next === before) return
    history.record(before, coalesceKey)
    set({ map: next, canUndo: history.canUndo, canRedo: history.canRedo })
  },
  endStroke: () => history.breakCoalescing(),
  setMap: (map) => {
    history.clear()
    set({ map, canUndo: false, canRedo: false, selection: null })
  },
  undo: () => {
    const prev = history.undo(get().map)
    if (prev) set({ map: prev, canUndo: history.canUndo, canRedo: history.canRedo })
  },
  redo: () => {
    const next = history.redo(get().map)
    if (next) set({ map: next, canUndo: history.canUndo, canRedo: history.canRedo })
  },
}))
