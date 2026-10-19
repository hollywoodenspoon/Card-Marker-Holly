/**
 * Sheet layout math for printing. Pure functions, all values in mm, origin at
 * the top-left of the page. No DOM, no PDF library.
 */
import type { FlipEdge, PrintOrientation } from '@/core/model/types'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SheetInput {
  /** Portrait paper size. */
  paper: { w: number; h: number }
  card: { w: number; h: number }
  bleedMm: number
  marginMm: number
  orientation: PrintOrientation
  cutMarks: boolean
  markLengthMm: number
  markOffsetMm: number
  /** Space between neighbouring cells, mm (default 0). */
  gapMm?: number
}

export interface SheetCell {
  /** Position on the sheet, row-major from the top-left. */
  slot: number
  col: number
  row: number
  /** Card plus bleed. */
  cell: Rect
  /** The card itself (cut line). */
  trim: Rect
}

export interface Sheet {
  orientation: 'portrait' | 'landscape'
  pageW: number
  pageH: number
  cols: number
  rows: number
  perSheet: number
  /** Bounding box of all cells. */
  grid: Rect
  cells: SheetCell[]
  marginMm: number
}

const EPS = 1e-6

/** Space reserved outside the grid for cut marks. */
export const markSpace = (i: Pick<SheetInput, 'cutMarks' | 'markLengthMm' | 'markOffsetMm'>) =>
  i.cutMarks ? i.markOffsetMm + i.markLengthMm : 0

/** How many cells fit in an area, with `gap` between neighbours. */
export function fitGrid(availW: number, availH: number, cellW: number, cellH: number, gap = 0) {
  const fit = (avail: number, size: number) =>
    size <= 0 || avail < size - EPS ? 0 : Math.floor((avail + gap) / (size + gap) + EPS)
  return { cols: fit(availW, cellW), rows: fit(availH, cellH) }
}

function pageFor(paper: SheetInput['paper'], o: 'portrait' | 'landscape') {
  const long = Math.max(paper.w, paper.h)
  const short = Math.min(paper.w, paper.h)
  return o === 'portrait' ? { pageW: short, pageH: long } : { pageW: long, pageH: short }
}

/** Cards per sheet in a given orientation. */
export function capacity(input: SheetInput, o: 'portrait' | 'landscape') {
  const { pageW, pageH } = pageFor(input.paper, o)
  const reserve = 2 * (input.marginMm + markSpace(input))
  const cellW = input.card.w + 2 * input.bleedMm
  const cellH = input.card.h + 2 * input.bleedMm
  const g = fitGrid(pageW - reserve, pageH - reserve, cellW, cellH, Math.max(0, input.gapMm ?? 0))
  return { ...g, perSheet: g.cols * g.rows }
}

/**
 * Lay out one sheet: cell = card + 2·bleed, cells abut (or sit `gapMm` apart), the grid is centred
 * on the page. With orientation 'auto' the orientation fitting more cards
 * wins (ties go to portrait).
 */
export function computeSheet(input: SheetInput): Sheet {
  const orientation =
    input.orientation === 'auto'
      ? capacity(input, 'landscape').perSheet > capacity(input, 'portrait').perSheet
        ? 'landscape'
        : 'portrait'
      : input.orientation
  const { pageW, pageH } = pageFor(input.paper, orientation)
  const { cols, rows } = capacity(input, orientation)
  const b = input.bleedMm
  const gap = Math.max(0, input.gapMm ?? 0)
  const cellW = input.card.w + 2 * b
  const cellH = input.card.h + 2 * b
  const gridW = cols ? cols * cellW + (cols - 1) * gap : 0
  const gridH = rows ? rows * cellH + (rows - 1) * gap : 0
  const gx = (pageW - gridW) / 2
  const gy = (pageH - gridH) / 2
  const cells: SheetCell[] = []
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = gx + col * (cellW + gap)
      const y = gy + row * (cellH + gap)
      cells.push({
        slot: cells.length,
        col,
        row,
        cell: { x, y, w: cellW, h: cellH },
        trim: { x: x + b, y: y + b, w: input.card.w, h: input.card.h },
      })
    }
  return {
    orientation,
    pageW,
    pageH,
    cols,
    rows,
    perSheet: cols * rows,
    grid: { x: gx, y: gy, w: gridW, h: gridH },
    cells,
    marginMm: input.marginMm,
  }
}

/** Distinct cut-line coordinates (trim edges) along each axis, sorted. */
export function trimLines(sheet: Sheet): { xs: number[]; ys: number[] } {
  const uniq = (vals: number[]) =>
    vals.sort((a, b) => a - b).filter((v, i, a) => i === 0 || Math.abs(v - a[i - 1]) > EPS)
  return {
    xs: uniq(
      sheet.cells.filter((c) => c.row === 0).flatMap((c) => [c.trim.x, c.trim.x + c.trim.w]),
    ),
    ys: uniq(
      sheet.cells.filter((c) => c.col === 0).flatMap((c) => [c.trim.y, c.trim.y + c.trim.h]),
    ),
  }
}

/**
 * Cut marks: a short tick for every cut line, placed outside the grid on all
 * four sides, starting `offset` mm away from the bleed edge. They never touch
 * any card's bleed area.
 */
export function cutMarks(
  sheet: Sheet,
  opts: { lengthMm: number; offsetMm: number; toEdge?: boolean },
): Line[] {
  if (!sheet.cells.length) return []
  const { xs, ys } = trimLines(sheet)
  const g = sheet.grid
  const o = opts.offsetMm
  const top = g.y
  const bottom = g.y + g.h
  const left = g.x
  const right = g.x + g.w
  // A mark starts `offset` from the grid and runs its length, or on to the paper edge.
  const end = (from: number, dir: -1 | 1, edge: number) =>
    opts.toEdge ? edge : from + dir * opts.lengthMm
  const lines: Line[] = []
  for (const x of xs) {
    lines.push({ x1: x, y1: end(top - o, -1, 0), x2: x, y2: top - o })
    lines.push({ x1: x, y1: bottom + o, x2: x, y2: end(bottom + o, 1, sheet.pageH) })
  }
  for (const y of ys) {
    lines.push({ x1: end(left - o, -1, 0), y1: y, x2: left - o, y2: y })
    lines.push({ x1: right + o, y1: y, x2: end(right + o, 1, sheet.pageW), y2: y })
  }
  return lines
}

/** Optional full guide lines through every cut line, across the printable area. */
export function guideLines(sheet: Sheet): Line[] {
  if (!sheet.cells.length) return []
  const { xs, ys } = trimLines(sheet)
  const m = sheet.marginMm
  return [
    ...xs.map((x) => ({ x1: x, y1: m, x2: x, y2: sheet.pageH - m })),
    ...ys.map((y) => ({ x1: m, y1: y, x2: sheet.pageW - m, y2: y })),
  ]
}

/** Does the backs sheet mirror horizontally (true) or vertically (false)? */
export function mirrorsX(orientation: 'portrait' | 'landscape', flip: FlipEdge) {
  // Flipping over the long edge of a portrait page (like a book) swaps left and right.
  return (orientation === 'portrait') === (flip === 'long')
}

/** Position on the backs page of something at `r` on the fronts page. */
export function mirrorRect(
  r: Rect,
  sheet: Pick<Sheet, 'pageW' | 'pageH' | 'orientation'>,
  flip: FlipEdge,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): Rect {
  const mx = mirrorsX(sheet.orientation, flip)
  return {
    x: (mx ? sheet.pageW - r.x - r.w : r.x) + offset.x,
    y: (mx ? r.y : sheet.pageH - r.y - r.h) + offset.y,
    w: r.w,
    h: r.h,
  }
}

/** A line on the fronts page, moved to where it sits on the backs page. */
export function mirrorLine(
  l: Line,
  sheet: Pick<Sheet, 'pageW' | 'pageH' | 'orientation'>,
  flip: FlipEdge,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): Line {
  const mx = mirrorsX(sheet.orientation, flip)
  return mx
    ? {
        x1: sheet.pageW - l.x1 + offset.x,
        y1: l.y1 + offset.y,
        x2: sheet.pageW - l.x2 + offset.x,
        y2: l.y2 + offset.y,
      }
    : {
        x1: l.x1 + offset.x,
        y1: sheet.pageH - l.y1 + offset.y,
        x2: l.x2 + offset.x,
        y2: sheet.pageH - l.y2 + offset.y,
      }
}

/**
 * Backs sheet: each card's back sits exactly behind its front when printed
 * double-sided. Contents stay upright (the printer's duplex setting handles
 * the page rotation).
 */
export function backCells(sheet: Sheet, flip: FlipEdge, offset = { x: 0, y: 0 }): SheetCell[] {
  return sheet.cells.map((c) => ({
    ...c,
    cell: mirrorRect(c.cell, sheet, flip, offset),
    trim: mirrorRect(c.trim, sheet, flip, offset),
  }))
}

/** Split card indices into sheets. */
export function paginate(count: number, perSheet: number): number[][] {
  if (perSheet <= 0) return []
  const out: number[][] = []
  for (let i = 0; i < count; i += perSheet)
    out.push(Array.from({ length: Math.min(perSheet, count - i) }, (_, k) => i + k))
  return out
}
