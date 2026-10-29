/**
 * Turns a pointer pick into the right map edit for the current mode and its
 * options. A stroke (press → drag → release) is one undo step, and touches each
 * column at most once, so dragging a raise over a tile lifts it one step, not
 * one step per mouse move. Keeps the viewports free of tool logic.
 */
import { type Cell, type Dir, DIR_STEP, sideRef, tileAt, topRef, type MapDoc } from '../model/map'
import type { TileRef } from '../model/tileset'
import { useEngine } from '../store/engineStore'
import {
  brushCells,
  fillRegion,
  paintSide,
  paintTop,
  placeOverhang,
  raise,
  removeOverhang,
  removeTile,
  sameTopEverywhere,
  setHeight,
  setKind,
  setSlope,
  setType,
} from './edit'

/** What the pointer is on: a tile's face (or an overhang block's), or empty ground. */
export interface Target {
  x: number
  z: number
  face: 'top' | 'bottom' | Dir
  overhang?: Cell
  /** World height of the hit point (to place blocks against a wall). */
  y?: number
  /** True when nothing was hit and this is the ground under the pointer. */
  ground?: boolean
}

export interface Stroke {
  key: string
  touched: Set<string>
  /** Flatten: the height the stroke started on. */
  flattenH?: number
}

let strokes = 0
export const newStroke = (): Stroke => ({ key: `stroke-${++strokes}`, touched: new Set() })

const DIRS: Dir[] = ['n', 'e', 's', 'w']

/** Cells not yet touched by this stroke under the op `tag`; marks them touched. */
function fresh(stroke: Stroke, tag: string, cells: [number, number][]) {
  return cells.filter(([x, z]) => {
    const k = `${tag}:${x},${z}`
    if (stroke.touched.has(k)) return false
    stroke.touched.add(k)
    return true
  })
}

export function applyTool(t: Target, mods: { alt: boolean; shift: boolean }, stroke: Stroke) {
  const s = useEngine.getState()
  if (s.mode === 'tile') {
    s.setSelection(
      t.ground && !tileAt(s.map, t.x, t.z) ? null : { x: t.x, z: t.z, overhang: t.overhang },
    )
    return
  }
  if (s.mode === 'terrain') return terrain(t, mods, stroke)
  return paint(t, mods, stroke)
}

function terrain(t: Target, { alt, shift }: { alt: boolean; shift: boolean }, stroke: Stroke) {
  const s = useEngine.getState()
  const o = s.terrain
  const commit = (fn: (m: MapDoc) => void) => s.commit(fn, stroke.key)

  if (o.op === 'overhang') {
    if (alt) {
      if (!t.overhang) return
      const c = t.overhang
      if (fresh(stroke, `oh-del${c.y}`, [[c.x, c.z]]).length) commit((m) => removeOverhang(m, c))
      return
    }
    const c = placeCell(s.map, t)
    if (c && fresh(stroke, `oh${c.y}`, [[c.x, c.z]]).length)
      commit((m) => placeOverhang(m, c, s.typeBrush))
    return
  }

  const cells = brushCells(s.map, t.x, t.z, o.size)
  switch (o.op) {
    case 'raise':
    case 'lower': {
      const sign = (o.op === 'lower') !== alt ? -1 : 1
      const dh = sign * (shift ? 1 : 2)
      const todo = fresh(stroke, 'h', cells)
      if (todo.length) commit((m) => todo.forEach(([x, z]) => raise(m, x, z, dh, s.typeBrush)))
      return
    }
    case 'flatten': {
      if (stroke.flattenH === undefined) stroke.flattenH = tileAt(s.map, t.x, t.z)?.h ?? 0
      const h = stroke.flattenH
      const todo = fresh(stroke, 'f', cells)
      if (todo.length) commit((m) => todo.forEach(([x, z]) => setHeight(m, x, z, h, s.typeBrush)))
      return
    }
    case 'slope': {
      const todo = fresh(stroke, 'sl', cells)
      const slope = alt ? undefined : { dir: o.slopeDir, rise: o.rise }
      if (todo.length) commit((m) => todo.forEach(([x, z]) => setSlope(m, x, z, slope)))
      return
    }
    case 'kind': {
      const todo = fresh(stroke, 'k', cells)
      const kind = alt ? 'ground' : o.kind
      if (todo.length) commit((m) => todo.forEach(([x, z]) => setKind(m, x, z, kind)))
      return
    }
    case 'hole': {
      const todo = fresh(stroke, 'x', cells)
      if (todo.length) commit((m) => todo.forEach(([x, z]) => removeTile(m, x, z)))
      return
    }
  }
}

/** Where a new overhang block goes: against the face that was clicked. */
function placeCell(map: MapDoc, t: Target): Cell | null {
  if (t.overhang) {
    const c = t.overhang
    if (t.face === 'top') return { ...c, y: c.y + 1 }
    if (t.face === 'bottom') return c.y > 0 ? { ...c, y: c.y - 1 } : null
    const { dx, dz } = DIR_STEP[t.face]
    return { x: c.x + dx, y: c.y, z: c.z + dz }
  }
  const tile = tileAt(map, t.x, t.z)
  if (t.face === 'top' || t.ground) return { x: t.x, y: tile ? Math.ceil(tile.h / 2) : 0, z: t.z }
  if (t.face === 'bottom') return null
  const { dx, dz } = DIR_STEP[t.face]
  return { x: t.x + dx, y: Math.max(0, Math.floor(t.y ?? 0)), z: t.z + dz }
}

function paint(t: Target, { alt }: { alt: boolean; shift: boolean }, stroke: Stroke) {
  const s = useEngine.getState()
  const o = s.paint
  const map = s.map

  // Alt-click is the eyedropper: pick up the face's tile and its terrain type.
  if (alt) {
    if (t.overhang) {
      const b = map.overhangs[`${t.overhang.x},${t.overhang.y},${t.overhang.z}`]
      if (b) s.setTypeBrush(b.type)
      return
    }
    const tile = tileAt(map, t.x, t.z)
    if (!tile) return
    const r =
      t.face === 'top' || t.face === 'bottom' ? topRef(map, tile) : sideRef(map, tile, t.face).ref
    s.setTileBrush(r)
    s.setTypeBrush(tile.type)
    return
  }

  // Overhang blocks carry only a type.
  if (t.overhang) {
    const c = t.overhang
    if (o.what === 'type' && fresh(stroke, `ohp${c.y}`, [[c.x, c.z]]).length)
      s.commit((m) => {
        const b = m.overhangs[`${c.x},${c.y},${c.z}`]
        if (b && b.type !== s.typeBrush) b.type = s.typeBrush
      }, stroke.key)
    return
  }
  if (!tileAt(map, t.x, t.z)) return

  const cells =
    o.tool === 'fill'
      ? fillRegion(map, t.x, t.z)
      : o.tool === 'replace'
        ? sameTopEverywhere(map, t.x, t.z)
        : brushCells(map, t.x, t.z, o.size)
  const ref: TileRef | null = o.what === 'tile' ? s.tileBrush : null

  // A side face clicked with "sides" and a 1-wide brush paints just that face.
  if (
    o.tool === 'brush' &&
    o.target === 'sides' &&
    t.face !== 'top' &&
    t.face !== 'bottom' &&
    o.size === 1
  ) {
    const dir = t.face
    if (fresh(stroke, `p${dir}`, [[t.x, t.z]]).length)
      s.commit(
        (m) =>
          o.what === 'type' ? setType(m, t.x, t.z, s.typeBrush) : paintSide(m, t.x, t.z, dir, ref),
        stroke.key,
      )
    return
  }
  const todo = fresh(stroke, `p-${o.target}`, cells)
  if (!todo.length) return
  s.commit((m) => {
    for (const [x, z] of todo) {
      if (o.what === 'type') {
        setType(m, x, z, s.typeBrush)
        continue
      }
      if (o.target !== 'sides') paintTop(m, x, z, ref)
      if (o.target !== 'tops') for (const d of DIRS) paintSide(m, x, z, d, ref)
    }
  }, stroke.key)
}
