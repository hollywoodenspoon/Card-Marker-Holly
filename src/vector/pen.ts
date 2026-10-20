/**
 * What the Pen tool does at a point, the way Illustrator's pen decides (with
 * Auto Add/Delete on): close on the first point, convert the last point,
 * join or continue open ends, add on a segment, delete on an anchor. Pure.
 */
import { dist, nearestOnPath, reverseSub, type Pt, type SubPath } from './geometry'
import type { VectorDoc } from './model'

export type PenIntent =
  | { kind: 'new' }
  | { kind: 'place' }
  | { kind: 'close'; pathId: string; sub: number }
  | { kind: 'convertLast'; pathId: string; sub: number; index: number }
  | { kind: 'join'; pathId: string; sub: number; end: 'start' | 'end' }
  | { kind: 'continue'; pathId: string; sub: number; end: 'start' | 'end' }
  | { kind: 'add'; pathId: string; sub: number; seg: number; t: number }
  | { kind: 'delete'; pathId: string; sub: number; index: number }
  | { kind: 'convert'; pathId: string; sub: number; index: number }

export interface PenContext {
  /** Path being drawn (its last subpath is the open one). */
  penPathId: string | null
  selection: string[]
  /** Alt / Option held. */
  alt?: boolean
}

/** Paths the pen can work on: visible and unlocked. */
function editable(doc: VectorDoc) {
  return doc.layers.flatMap((l) =>
    l.visible && !l.locked ? l.items.filter((i) => !i.hidden && !i.locked) : [],
  )
}

/** `tol` is the hit distance in document units (screen px / zoom). */
export function penIntent(doc: VectorDoc, ctx: PenContext, p: Pt, tol: number): PenIntent {
  const items = editable(doc)
  const near = (a: Pt) => dist(a, p) <= tol
  const drawing = ctx.penPathId ? items.find((i) => i.id === ctx.penPathId) : undefined

  if (drawing) {
    const si = drawing.subpaths.length - 1
    const sub = drawing.subpaths[si]
    if (sub && !sub.closed && sub.anchors.length) {
      const first = sub.anchors[0]
      const last = sub.anchors[sub.anchors.length - 1]
      if (sub.anchors.length >= 2 && near(first))
        return { kind: 'close', pathId: drawing.id, sub: si }
      if (near(last))
        return { kind: 'convertLast', pathId: drawing.id, sub: si, index: sub.anchors.length - 1 }
      // The open end of another path (or another open part of this one): join.
      for (const it of items)
        for (let k = 0; k < it.subpaths.length; k++) {
          if (it.id === drawing.id && k === si) continue
          const s = it.subpaths[k]
          if (s.closed || !s.anchors.length) continue
          if (near(s.anchors[s.anchors.length - 1]))
            return { kind: 'join', pathId: it.id, sub: k, end: 'end' }
          if (near(s.anchors[0])) return { kind: 'join', pathId: it.id, sub: k, end: 'start' }
        }
    }
    return { kind: 'place' }
  }

  const selected = items.filter((i) => ctx.selection.includes(i.id))
  // Alt over an anchor of a selected path: convert it (corner ↔ smooth).
  if (ctx.alt)
    for (const it of selected)
      for (let k = 0; k < it.subpaths.length; k++) {
        const i = it.subpaths[k].anchors.findIndex(near)
        if (i >= 0) return { kind: 'convert', pathId: it.id, sub: k, index: i }
      }
  // The end of any open path: continue drawing it.
  for (const it of items)
    for (let k = 0; k < it.subpaths.length; k++) {
      const s = it.subpaths[k]
      if (s.closed || !s.anchors.length) continue
      if (near(s.anchors[s.anchors.length - 1]))
        return { kind: 'continue', pathId: it.id, sub: k, end: 'end' }
      if (near(s.anchors[0])) return { kind: 'continue', pathId: it.id, sub: k, end: 'start' }
    }
  for (const it of selected)
    for (let k = 0; k < it.subpaths.length; k++) {
      const i = it.subpaths[k].anchors.findIndex(near)
      if (i >= 0) return { kind: 'delete', pathId: it.id, sub: k, index: i }
    }
  let best: { id: string; hit: NonNullable<ReturnType<typeof nearestOnPath>> } | null = null
  for (const it of selected) {
    const h = nearestOnPath(it.subpaths, p)
    if (h && h.dist <= tol && (!best || h.dist < best.hit.dist)) best = { id: it.id, hit: h }
  }
  if (best)
    return { kind: 'add', pathId: best.id, sub: best.hit.sub, seg: best.hit.seg, t: best.hit.t }
  return { kind: 'new' }
}

/**
 * Join the end of `a` (the path being drawn) to `b`'s `bEnd`: the new segment
 * goes to that end, and `b` carries on from there.
 */
export function joinSubpaths(a: SubPath, b: SubPath, bEnd: 'start' | 'end'): SubPath {
  const tail = bEnd === 'start' ? b : reverseSub(b)
  return { closed: false, anchors: [...a.anchors, ...tail.anchors].map((x) => ({ ...x })) }
}

/** The open subpath without its last point (Backspace while drawing), or null when too short. */
export function removeLastPoint(sub: SubPath): SubPath | null {
  if (sub.anchors.length <= 1) return null
  const anchors = sub.anchors.slice(0, -1).map((x) => ({ ...x }))
  // The new last point has no segment after it, so no out-handle.
  delete anchors[anchors.length - 1].hout
  return { closed: false, anchors }
}

/** Hint for the tool options (also the meaning of the cursor badge). */
export const PEN_HINTS: Record<PenIntent['kind'], string> = {
  new: 'Click for a corner point, drag for a curve.',
  place: 'Click for a corner, drag for a curve (Alt-drag breaks the handle, Shift = 45°).',
  close: 'Click to close the path.',
  convertLast: 'Click to make the next segment start as a corner; drag for a new handle.',
  join: 'Click to join this path to the other one.',
  continue: 'Click to carry on drawing this path.',
  add: 'Click to add a point here.',
  delete: 'Click to delete this point.',
  convert: 'Click to switch this point between corner and smooth.',
}
