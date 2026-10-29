/**
 * Pure map edits the tools perform. Each takes a mutable MapDoc (an immer draft,
 * from the store's `commit`) so the whole operation is one undo step. They do
 * nothing when the target is out of bounds or already in the wanted state, which
 * keeps drag-strokes from recording empty changes.
 */
import { blockAt, type Cell, cellKey, inBounds, type MapDoc } from '../model/map'

/** Place a block of `type` at `cell` if it's in bounds and empty. */
export function placeBlock(map: MapDoc, cell: Cell, type: string) {
  if (!inBounds(map, cell) || blockAt(map, cell)) return
  map.blocks[cellKey(cell)] = { type }
}

/** Remove the block at `cell` if there is one. */
export function removeBlock(map: MapDoc, cell: Cell) {
  delete map.blocks[cellKey(cell)]
}

/** Set an existing block's type (paint). No-op on an empty cell or same type. */
export function paintBlock(map: MapDoc, cell: Cell, type: string) {
  const b = blockAt(map, cell)
  if (!b || b.type === type) return
  b.type = type
}

/** The highest y with a block in a column, or -1 when the column is empty. */
export function columnTop(map: MapDoc, x: number, z: number): number {
  let top = -1
  for (const key of Object.keys(map.blocks)) {
    const [bx, by, bz] = key.split(',').map(Number)
    if (bx === x && bz === z && by > top) top = by
  }
  return top
}

/** Raise a column: add one block of `type` on top of it (or on the ground). */
export function raiseColumn(map: MapDoc, x: number, z: number, type: string) {
  placeBlock(map, { x, y: columnTop(map, x, z) + 1, z }, type)
}

/** Lower a column: remove its topmost block. */
export function lowerColumn(map: MapDoc, x: number, z: number) {
  const top = columnTop(map, x, z)
  if (top >= 0) removeBlock(map, { x, y: top, z })
}
