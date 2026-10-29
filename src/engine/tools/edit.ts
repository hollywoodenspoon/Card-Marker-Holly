/**
 * Pure map edits the tools perform, on an immer draft from the store's
 * `commit`, so each operation (or a whole drag) is one undo step. Out-of-grid
 * targets and no-op changes are ignored, keeping strokes from recording empty
 * steps.
 */
import {
  type Cell,
  cellKey,
  type Dir,
  DIR_STEP,
  inGrid,
  type MapDoc,
  setTile,
  type Slope,
  type Tile,
  tileAt,
  type TileKind,
  topRef,
} from '../model/map'
import { sameRef, type TileRef } from '../model/tileset'

/** Highest a column can go, in half steps (32 full blocks). */
export const MAX_H = 64

const clampH = (h: number) => Math.max(0, Math.min(MAX_H, h))

/** The cells a square brush of `size` (1, 3, 5…) covers around (x, z), inside the grid. */
export function brushCells(map: MapDoc, x: number, z: number, size: number): [number, number][] {
  const r = Math.floor(size / 2)
  const out: [number, number][] = []
  for (let dz = -r; dz <= r; dz++)
    for (let dx = -r; dx <= r; dx++) if (inGrid(map, x + dx, z + dz)) out.push([x + dx, z + dz])
  return out
}

/** Raise (or with a negative `dh`, lower) a column; a hole gets a new tile of `type`. */
export function raise(map: MapDoc, x: number, z: number, dh: number, type: string) {
  if (!inGrid(map, x, z)) return
  const t = tileAt(map, x, z)
  if (!t) {
    if (dh > 0) setTile(map, x, z, { type, h: clampH(dh) })
    return
  }
  const h = clampH(t.h + dh)
  if (h !== t.h) t.h = h
}

/** Set a column to an exact height (flatten). */
export function setHeight(map: MapDoc, x: number, z: number, h: number, type: string) {
  if (!inGrid(map, x, z)) return
  const t = tileAt(map, x, z)
  if (!t) setTile(map, x, z, { type, h: clampH(h) })
  else if (t.h !== clampH(h)) t.h = clampH(h)
}

/** Remove a column entirely, leaving a hole. */
export function removeTile(map: MapDoc, x: number, z: number) {
  if (tileAt(map, x, z)) setTile(map, x, z, null)
}

export function setSlope(map: MapDoc, x: number, z: number, slope: Slope | undefined) {
  const t = tileAt(map, x, z)
  if (!t) return
  if (!slope) {
    if (t.slope) delete t.slope
  } else if (t.slope?.dir !== slope.dir || t.slope?.rise !== slope.rise) t.slope = { ...slope }
}

/** Set a tile's kind; the type's own kind clears the override. */
export function setKind(map: MapDoc, x: number, z: number, kind: TileKind) {
  const t = tileAt(map, x, z)
  if (!t) return
  const typeKind = map.tileTypes.find((tt) => tt.id === t.type)?.kind ?? 'ground'
  if (kind === typeKind) {
    if (t.kind) delete t.kind
  } else if (t.kind !== kind) t.kind = kind
}

export function setType(map: MapDoc, x: number, z: number, type: string) {
  const t = tileAt(map, x, z)
  if (t && t.type !== type) t.type = type
}

/** Paint a column's top face (a tile override), or clear the override with null. */
export function paintTop(map: MapDoc, x: number, z: number, ref: TileRef | null) {
  const t = tileAt(map, x, z)
  if (!t) return
  if (!ref) {
    if (t.top) delete t.top
  } else if (!sameRef(t.top, ref)) t.top = { ...ref }
}

/** Paint one side wall of a column, or clear it with null. */
export function paintSide(map: MapDoc, x: number, z: number, dir: Dir, ref: TileRef | null) {
  const t = tileAt(map, x, z)
  if (!t) return
  if (!ref) {
    if (t.sides?.[dir]) {
      delete t.sides[dir]
      if (!Object.keys(t.sides).length) delete t.sides
    }
    return
  }
  if (sameRef(t.sides?.[dir], ref)) return
  t.sides = { ...t.sides, [dir]: { ...ref } }
}

/**
 * Every tile connected to (x, z) through edges whose top shows the same tile,
 * like a paint bucket. Heights don't matter; holes stop the fill.
 */
export function fillRegion(map: MapDoc, x: number, z: number): [number, number][] {
  const start = tileAt(map, x, z)
  if (!start) return []
  const want = topRef(map, start)
  const seen = new Set<string>([`${x},${z}`])
  const queue: [number, number][] = [[x, z]]
  const out: [number, number][] = []
  while (queue.length) {
    const [cx, cz] = queue.pop()!
    out.push([cx, cz])
    for (const { dx, dz } of Object.values(DIR_STEP)) {
      const nx = cx + dx
      const nz = cz + dz
      const k = `${nx},${nz}`
      if (seen.has(k)) continue
      seen.add(k)
      const t = tileAt(map, nx, nz)
      if (t && sameRef(topRef(map, t), want)) queue.push([nx, nz])
    }
  }
  return out
}

/** Every tile in the map whose top shows the same tile as (x, z) — "replace everywhere". */
export function sameTopEverywhere(map: MapDoc, x: number, z: number): [number, number][] {
  const start = tileAt(map, x, z)
  if (!start) return []
  const want = topRef(map, start)
  const out: [number, number][] = []
  for (let zz = 0; zz < map.size.z; zz++)
    for (let xx = 0; xx < map.size.x; xx++) {
      const t = tileAt(map, xx, zz)
      if (t && sameRef(topRef(map, t), want)) out.push([xx, zz])
    }
  return out
}

/** Place a detached block (bridge, arch) if the cell is free and in the grid. */
export function placeOverhang(map: MapDoc, c: Cell, type: string) {
  if (!inGrid(map, c.x, c.z) || c.y < 0 || c.y >= MAX_H / 2) return
  const k = cellKey(c)
  if (!map.overhangs[k]) map.overhangs[k] = { type }
}

export function removeOverhang(map: MapDoc, c: Cell) {
  const k = cellKey(c)
  if (map.overhangs[k]) delete map.overhangs[k]
}

/** A copy of a tile (for the inspector and tests). */
export const cloneTile = (t: Tile): Tile => structuredClone(t)
