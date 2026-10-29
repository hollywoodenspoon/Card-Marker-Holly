/**
 * Turns a pointer pick into the right map edit for the current tool, and reports
 * a signature of the affected cell/column so a drag-stroke skips repeats (one
 * raise per column, one block per cell). Keeps the viewport free of tool logic.
 */
import type { Cell } from '../model/map'
import { useEngine } from '../store/engineStore'
import { lowerColumn, paintBlock, placeBlock, raiseColumn, removeBlock } from './edit'

/** What the cursor is over: a block face and/or the ground plane under it. */
export interface Pick {
  block?: { cell: Cell; normal: Cell }
  ground?: Cell
}

const add = (c: Cell, n: Cell): Cell => ({ x: c.x + n.x, y: c.y + n.y, z: c.z + n.z })
const col = (c: Cell) => `${c.x},${c.z}`
const key = (c: Cell) => `${c.x},${c.y},${c.z}`

/**
 * Apply the active tool at `pick`. `alt` lowers/erases. `strokeKey` groups a
 * drag into one undo step; `lastSig` is what this stroke last touched. Returns
 * the new signature (or `lastSig` unchanged when nothing applied).
 */
export function applyTool(pick: Pick, alt: boolean, strokeKey: string, lastSig: string): string {
  const { tool, brush, commit, setSelection } = useEngine.getState()

  if (tool === 'select') {
    setSelection(pick.block?.cell ?? null)
    return lastSig
  }

  if (tool === 'terrain') {
    const c = pick.block?.cell ?? pick.ground
    if (!c) return lastSig
    const sig = `${alt ? 'lower' : 'raise'}:${col(c)}`
    if (sig === lastSig) return lastSig
    commit((m) => (alt ? lowerColumn(m, c.x, c.z) : raiseColumn(m, c.x, c.z, brush)), strokeKey)
    return sig
  }

  if (tool === 'paint') {
    const c = pick.block?.cell
    if (!c) return lastSig
    const sig = `paint:${key(c)}:${brush}`
    if (sig === lastSig) return lastSig
    commit((m) => paintBlock(m, c, brush), strokeKey)
    return sig
  }

  // tile: place a block against the hovered face (or on the ground), erase with alt.
  if (alt) {
    const c = pick.block?.cell
    if (!c) return lastSig
    const sig = `erase:${key(c)}`
    if (sig === lastSig) return lastSig
    commit((m) => removeBlock(m, c), strokeKey)
    return sig
  }
  const c = pick.block ? add(pick.block.cell, pick.block.normal) : pick.ground
  if (!c) return lastSig
  const sig = `place:${key(c)}`
  if (sig === lastSig) return lastSig
  commit((m) => placeBlock(m, c, brush), strokeKey)
  return sig
}
