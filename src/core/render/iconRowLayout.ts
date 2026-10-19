import type { IconRowDirection } from '../model/types'

export interface IconRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Positions (mm, relative to the box) of `count` icons in a row or column,
 * centred on both axes. Each icon fits a square `iconMm` cell keeping its
 * aspect ratio (width / height). With `fitToBox`, cells and gaps shrink
 * together when the run would overflow the box.
 */
export function iconRowLayout(
  box: { w: number; h: number },
  count: number,
  aspect: number,
  opts: { direction: IconRowDirection; iconMm: number; gapMm: number; fitToBox: boolean },
): IconRect[] {
  const n = Math.max(0, Math.floor(count))
  if (!n) return []
  const horizontal = opts.direction === 'horizontal'
  const main = horizontal ? box.w : box.h
  const cross = horizontal ? box.h : box.w
  let cell = opts.iconMm
  let gap = opts.gapMm
  const run = n * cell + (n - 1) * gap
  if (opts.fitToBox) {
    const s = Math.min(1, run > 0 ? main / run : 1, cell > 0 ? cross / cell : 1)
    cell *= s
    gap *= s
  }
  const total = n * cell + (n - 1) * gap
  const start = (main - total) / 2
  const crossStart = (cross - cell) / 2
  // icon inside its square cell, aspect kept
  const iw = aspect >= 1 ? cell : cell * aspect
  const ih = aspect >= 1 ? cell / aspect : cell
  const out: IconRect[] = []
  for (let i = 0; i < n; i++) {
    const m = start + i * (cell + gap)
    const cx = horizontal ? m : crossStart
    const cy = horizontal ? crossStart : m
    out.push({ x: cx + (cell - iw) / 2, y: cy + (cell - ih) / 2, w: iw, h: ih })
  }
  return out
}

/**
 * Icons to draw: `count` coloured ones and `greyCount` greyscale ones, the
 * grey ones at the start (left / top) or end of the row. One flag per icon,
 * true = grey.
 */
export function iconRowSlots(
  count: number,
  greyCount: number,
  greyAt?: 'start' | 'end',
): boolean[] {
  const n = Math.max(0, Math.floor(count))
  const grey = Math.max(0, Math.floor(greyCount))
  const lit = Array<boolean>(n).fill(false)
  const off = Array<boolean>(grey).fill(true)
  return greyAt === 'start' ? [...off, ...lit] : [...lit, ...off]
}
