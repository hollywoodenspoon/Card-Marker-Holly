/** Snapping for the Vector Maker: artboard edges and centre, other anchors, whole pixels. */
import type { Pt } from '../geometry'
import { useVector } from '../store'

export interface SnapLines {
  xs: number[]
  ys: number[]
}

/** Lines to snap to, leaving out the given paths (the ones being moved). */
export function snapLines(exclude: Set<string>): SnapLines {
  const { doc } = useVector.getState()
  const xs = [0, doc.width / 2, doc.width]
  const ys = [0, doc.height / 2, doc.height]
  for (const l of doc.layers) {
    if (!l.visible) continue
    for (const it of l.items) {
      if (it.hidden || exclude.has(it.id)) continue
      for (const s of it.subpaths)
        for (const a of s.anchors) {
          xs.push(a.x)
          ys.push(a.y)
        }
    }
  }
  return { xs, ys }
}

const nearest = (v: number, lines: number[], tol: number) => {
  let best: number | null = null
  for (const l of lines)
    if (Math.abs(l - v) <= tol && (best === null || Math.abs(l - v) < Math.abs(best - v))) best = l
  return best
}

/** Snap a point (doc px). `tolPx` is in screen pixels. */
export function snapPoint(p: Pt, lines: SnapLines, tolPx = 6): Pt {
  const { snap, pixelGrid, view } = useVector.getState()
  let { x, y } = p
  if (snap) {
    const tol = tolPx / view.zoom
    x = nearest(x, lines.xs, tol) ?? x
    y = nearest(y, lines.ys, tol) ?? y
  }
  if (pixelGrid) {
    x = Math.round(x)
    y = Math.round(y)
  }
  return { x, y }
}

/** Snap a move: the offset that brings the box's left / centre / right (top / middle / bottom) onto a line. */
export function snapDelta(
  box: { x: number; y: number; w: number; h: number },
  d: Pt,
  lines: SnapLines,
  tolPx = 6,
): Pt {
  const { snap, pixelGrid, view } = useVector.getState()
  let { x: dx, y: dy } = d
  if (snap) {
    const tol = tolPx / view.zoom
    const fit = (edges: number[], ls: number[]) => {
      let best: number | null = null
      for (const e of edges) {
        const n = nearest(e, ls, tol)
        if (n !== null && (best === null || Math.abs(n - e) < Math.abs(best))) best = n - e
      }
      return best ?? 0
    }
    dx += fit([box.x + dx, box.x + dx + box.w / 2, box.x + dx + box.w], lines.xs)
    dy += fit([box.y + dy, box.y + dy + box.h / 2, box.y + dy + box.h], lines.ys)
  }
  if (pixelGrid) {
    dx = Math.round(box.x + dx) - box.x
    dy = Math.round(box.y + dy) - box.y
  }
  return { x: dx, y: dy }
}
