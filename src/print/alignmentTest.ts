import type { FlipEdge } from '@/core/model/types'
import { mirrorRect } from './layout'

export interface Target {
  x: number
  y: number
  label: string
}

/**
 * Crosshair targets for the double-sided alignment test: four near the corners
 * and one in the centre. The back page gets the same targets mirrored, so
 * they land on top of each other when the printer is aligned.
 */
export function alignmentTargets(
  page: { pageW: number; pageH: number; orientation: 'portrait' | 'landscape' },
  marginMm: number,
  flip: FlipEdge,
  offset = { x: 0, y: 0 },
) {
  const inset = marginMm + 20
  const front: Target[] = [
    { x: inset, y: inset, label: 'A' },
    { x: page.pageW - inset, y: inset, label: 'B' },
    { x: inset, y: page.pageH - inset, label: 'C' },
    { x: page.pageW - inset, y: page.pageH - inset, label: 'D' },
    { x: page.pageW / 2, y: page.pageH / 2, label: 'E' },
  ]
  const back = front.map((t) => {
    const r = mirrorRect({ x: t.x, y: t.y, w: 0, h: 0 }, page, flip, offset)
    return { x: r.x, y: r.y, label: t.label }
  })
  return { front, back }
}
