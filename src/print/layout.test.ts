import { describe, expect, it } from 'vitest'
import { alignmentTargets } from './alignmentTest'
import {
  backCells,
  capacity,
  computeSheet,
  cutMarks,
  dotted,
  edgeLines,
  fitGrid,
  guideLines,
  mirrorLine,
  mirrorRect,
  paginate,
  sheetLines,
  trimLines,
  type Line,
  type Rect,
  type SheetInput,
} from './layout'
import { PAPERS } from './paper'
import { DEFAULT_PRINT, normalizePrint } from './settings'

const base: SheetInput = {
  paper: PAPERS.A4,
  card: { w: 86, h: 54 },
  bleedMm: 3,
  marginMm: 5,
  orientation: 'auto',
  cutMarks: true,
  markLengthMm: 4,
  markOffsetMm: 2,
}
const mark = { lengthMm: 4, offsetMm: 2 }

/** Does a line segment touch the inside of a rectangle? */
function hits(l: Line, r: Rect) {
  const minX = Math.min(l.x1, l.x2)
  const maxX = Math.max(l.x1, l.x2)
  const minY = Math.min(l.y1, l.y2)
  const maxY = Math.max(l.y1, l.y2)
  return maxX > r.x && minX < r.x + r.w && maxY > r.y && minY < r.y + r.h
}

describe('grid fit', () => {
  it('fits 8 ID cards (2 × 4) on portrait A4 with bleed and marks', () => {
    const s = computeSheet(base)
    expect(s.orientation).toBe('portrait')
    expect([s.cols, s.rows, s.perSheet]).toEqual([2, 4, 8])
    expect([s.pageW, s.pageH]).toEqual([210, 297])
  })

  it('fits 9 portrait ID cards (3 × 3) with the default 3.5 mm marks', () => {
    const d = normalizePrint(undefined)
    const s = computeSheet({ ...base, card: { w: 54, h: 86 }, markLengthMm: d.markLengthMm })
    expect([s.orientation, s.cols, s.rows, s.perSheet]).toEqual(['portrait', 3, 3, 9])
    // 4 mm marks leave 275 mm for 276 mm of cells: 8 on a landscape page
    const l = computeSheet({ ...base, card: { w: 54, h: 86 } })
    expect([l.orientation, l.cols, l.rows, l.perSheet]).toEqual(['landscape', 4, 2, 8])
  })

  it('compares orientations and lets the user override', () => {
    expect(capacity(base, 'landscape')).toMatchObject({ cols: 2, rows: 3, perSheet: 6 })
    const l = computeSheet({ ...base, orientation: 'landscape' })
    expect([l.pageW, l.pageH, l.perSheet]).toEqual([297, 210, 6])
  })

  it('picks landscape when it fits more', () => {
    // 60 × 40 card, no bleed: portrait 3 × 6 = 18, landscape 4 × 4 = 16 → portrait;
    // 100 × 40: portrait 1 × 6 = 6, landscape 2 × 4 = 8 → landscape
    expect(computeSheet({ ...base, card: { w: 100, h: 40 }, bleedMm: 0 }).orientation).toBe(
      'landscape',
    )
  })

  it('handles other presets, zero bleed and no marks', () => {
    expect(computeSheet({ ...base, card: { w: 63.5, h: 88.9 } }).perSheet).toBe(4)
    expect(
      computeSheet({ ...base, card: { w: 63.5, h: 88.9 }, bleedMm: 0, cutMarks: false }).perSheet,
    ).toBe(9)
    expect(computeSheet({ ...base, bleedMm: 0 }).perSheet).toBe(10) // 86 × 54 → 2 × 5
    // without marks landscape gains a column: 3 × 3 = 9 beats portrait 2 × 4
    const noMarks = computeSheet({ ...base, cutMarks: false })
    expect([noMarks.orientation, noMarks.perSheet]).toEqual(['landscape', 9])
  })

  it('fits nothing when the card is bigger than the page', () => {
    const s = computeSheet({ ...base, card: { w: 300, h: 300 } })
    expect(s.perSheet).toBe(0)
    expect(cutMarks(s, mark)).toEqual([])
  })

  it('counts exact fits', () => {
    expect(fitGrid(184, 240, 92, 60)).toEqual({ cols: 2, rows: 4 })
    expect(fitGrid(183.99, 240, 92, 60)).toEqual({ cols: 1, rows: 4 })
  })
})

describe('sheet geometry', () => {
  const s = computeSheet(base)

  it('centres the grid on the page', () => {
    expect(s.grid).toEqual({ x: (210 - 184) / 2, y: (297 - 240) / 2, w: 184, h: 240 })
  })

  it('places trims inside cells by the bleed', () => {
    const c = s.cells[3] // row 1, col 1
    expect(c).toMatchObject({ col: 1, row: 1 })
    expect(c.cell).toEqual({ x: 13 + 92, y: 28.5 + 60, w: 92, h: 60 })
    expect(c.trim).toEqual({ x: 13 + 92 + 3, y: 28.5 + 60 + 3, w: 86, h: 54 })
  })

  it('keeps every cell and mark inside the printable area', () => {
    const inside = (x: number, y: number) =>
      x >= 5 - 1e-9 && x <= 205 + 1e-9 && y >= 5 - 1e-9 && y <= 292 + 1e-9
    for (const c of s.cells) {
      expect(inside(c.cell.x, c.cell.y)).toBe(true)
      expect(inside(c.cell.x + c.cell.w, c.cell.y + c.cell.h)).toBe(true)
    }
    for (const l of cutMarks(s, mark)) {
      expect(inside(l.x1, l.y1) && inside(l.x2, l.y2)).toBe(true)
    }
  })
})

describe('cut marks', () => {
  const s = computeSheet(base)
  const marks = cutMarks(s, mark)

  it('never touch any card or its bleed', () => {
    for (const l of marks) for (const c of s.cells) expect(hits(l, c.cell)).toBe(false)
  })

  it('has one mark per cut line on each side', () => {
    const { xs, ys } = trimLines(s)
    expect(xs).toEqual([16, 102, 108, 194])
    expect(ys).toEqual([31.5, 85.5, 91.5, 145.5, 151.5, 205.5, 211.5, 265.5])
    expect(marks).toHaveLength(2 * xs.length + 2 * ys.length)
  })

  it('starts the offset away from the bleed edge and runs the mark length', () => {
    const top = marks.find((l) => l.x1 === 16 && l.y2 < s.grid.y)!
    expect(top).toEqual({ x1: 16, y1: 28.5 - 2 - 4, x2: 16, y2: 28.5 - 2 })
    const right = marks.find((l) => l.y1 === 31.5 && l.x1 > s.grid.x + s.grid.w)!
    expect(right).toEqual({ x1: 197 + 2, y1: 31.5, x2: 197 + 6, y2: 31.5 })
  })

  it('can run every mark from the gap out to the paper edge', () => {
    const edge = cutMarks(s, { ...mark, toEdge: true })
    expect(edge).toHaveLength(marks.length)
    for (const l of edge) for (const c of s.cells) expect(hits(l, c.cell)).toBe(false)
    const top = edge.find((l) => l.x1 === 16 && l.y2 < s.grid.y)!
    expect(top).toEqual({ x1: 16, y1: 0, x2: 16, y2: 28.5 - 2 })
    const bottom = edge.find((l) => l.x1 === 16 && l.y1 > s.grid.y)!
    expect(bottom).toEqual({ x1: 16, y1: s.grid.y + s.grid.h + 2, x2: 16, y2: 297 })
    const left = edge.find((l) => l.y1 === 31.5 && l.x2 < s.grid.x)!
    expect(left).toEqual({ x1: 0, y1: 31.5, x2: 13 - 2, y2: 31.5 })
    const right = edge.find((l) => l.y1 === 31.5 && l.x1 > s.grid.x + s.grid.w)!
    expect(right).toEqual({ x1: 197 + 2, y1: 31.5, x2: 210, y2: 31.5 })
  })

  it('mirrors marks that run to the edge onto the backs page', () => {
    const edge = cutMarks(s, { ...mark, toEdge: true })
    const left = edge.find((l) => l.y1 === 31.5 && l.x2 < s.grid.x)!
    // portrait + long edge mirrors left/right: the mark now runs from the gap to the right edge
    const m = mirrorLine(left, s, 'long')
    expect([Math.min(m.x1, m.x2), Math.max(m.x1, m.x2)]).toEqual([210 - 11, 210])
  })

  it('shares cut lines between neighbours when there is no bleed', () => {
    const s0 = computeSheet({ ...base, bleedMm: 0 })
    expect(trimLines(s0).xs).toHaveLength(3)
  })

  it('draws optional guide lines exactly on the cut lines', () => {
    const g = guideLines(s)
    const { xs, ys } = trimLines(s)
    expect(g.filter((l) => l.x1 === l.x2).map((l) => l.x1)).toEqual(xs)
    expect(g.filter((l) => l.y1 === l.y2).map((l) => l.y1)).toEqual(ys)
    expect(g[0]).toMatchObject({ y1: 5, y2: 292 })
  })
})

describe('mirrored backs', () => {
  const s = computeSheet(base)

  it('long-edge flip on portrait mirrors left and right', () => {
    const b = backCells(s, 'long')
    // col 0 front ↔ right column on the back, same row
    expect(b[0].cell).toEqual({ x: 210 - 13 - 92, y: 28.5, w: 92, h: 60 })
    expect(b[0].trim.x).toBe(210 - 16 - 86)
  })

  it('short-edge flip on portrait mirrors top and bottom', () => {
    const b = backCells(s, 'short')
    expect(b[0].cell).toEqual({ x: 13, y: 297 - 28.5 - 60, w: 92, h: 60 })
  })

  it('swaps the axes on a landscape page', () => {
    const l = computeSheet({ ...base, orientation: 'landscape' })
    expect(backCells(l, 'long')[0].cell.x).toBe(l.cells[0].cell.x)
    expect(backCells(l, 'long')[0].cell.y).toBe(210 - l.cells[0].cell.y - 60)
    expect(backCells(l, 'short')[0].cell.y).toBe(l.cells[0].cell.y)
  })

  it('lands every back on the same grid slots, and mirroring twice is identity', () => {
    const b = backCells(s, 'long')
    const fronts = new Set(s.cells.map((c) => `${c.cell.x},${c.cell.y}`))
    for (const c of b) expect(fronts.has(`${c.cell.x},${c.cell.y}`)).toBe(true)
    for (const c of s.cells)
      expect(mirrorRect(mirrorRect(c.cell, s, 'short'), s, 'short')).toEqual(c.cell)
  })

  it('moves cut marks behind the front marks on the backs page', () => {
    const marks = cutMarks(s, mark)
    const backMarks = marks.map((l) => mirrorLine(l, s, 'long'))
    // the back trims are mirrored too, so every back mark still sits on a back cut line
    const backXs = new Set(backCells(s, 'long').flatMap((c) => [c.trim.x, c.trim.x + c.trim.w]))
    for (const l of backMarks.filter((l) => l.x1 === l.x2)) expect(backXs.has(l.x1)).toBe(true)
    for (const l of backMarks)
      for (const c of backCells(s, 'long')) expect(hits(l, c.cell)).toBe(false)
  })

  it('applies the back offset', () => {
    const b = backCells(s, 'long', { x: 0.5, y: -0.3 })
    expect(b[0].cell.x).toBeCloseTo(105 + 0.5)
    expect(b[0].cell.y).toBeCloseTo(28.5 - 0.3)
  })

  it('paginates cards into front/back sheet pairs', () => {
    expect(paginate(19, 8)).toEqual([
      [0, 1, 2, 3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14, 15],
      [16, 17, 18],
    ])
    expect(paginate(5, 0)).toEqual([])
  })
})

describe('alignment test', () => {
  it('mirrors the targets onto the back page', () => {
    const page = { pageW: 210, pageH: 297, orientation: 'portrait' as const }
    const { front, back } = alignmentTargets(page, 5, 'long')
    expect(front[0]).toMatchObject({ x: 25, y: 25 })
    expect(back[0]).toMatchObject({ x: 185, y: 25 })
    expect(back[4]).toMatchObject({ x: 105, y: 148.5 })
    const short = alignmentTargets(page, 5, 'short', { x: 1, y: 0 })
    expect(short.back[0]).toMatchObject({ x: 26, y: 272 })
  })
})

describe('print settings', () => {
  it('fills defaults for old projects', () => {
    expect(normalizePrint({ paper: 'A4', marginMm: 7 })).toEqual({ ...DEFAULT_PRINT, marginMm: 7 })
  })
})

describe('gap between cards and paper sizes', () => {
  const card = { w: 54, h: 86 }
  it('spaces cells by the gap, keeps them centred and inside the margin', () => {
    const s = computeSheet({ ...base, card, gapMm: 4 })
    const [a, b] = s.cells
    expect(b.cell.x - (a.cell.x + a.cell.w)).toBeCloseTo(4)
    expect(s.grid.x).toBeCloseTo((s.pageW - s.grid.w) / 2)
    for (const c of s.cells) {
      expect(c.cell.x).toBeGreaterThanOrEqual(5)
      expect(c.cell.x + c.cell.w).toBeLessThanOrEqual(s.pageW - 5)
    }
  })

  it('fits fewer cards when the gap needs the room, and marks every cut line', () => {
    expect(computeSheet({ ...base, card, markLengthMm: 3.5 }).perSheet).toBe(9)
    // 3 rows of 92 mm need 2 × 4 mm more with a 4 mm gap: only 2 rows fit on portrait
    const g = computeSheet({ ...base, card, markLengthMm: 3.5, gapMm: 4 })
    expect(g.perSheet).toBeLessThan(9)
    const { xs } = trimLines(g)
    expect(xs).toHaveLength(2 * g.cols)
    for (const l of cutMarks(g, mark)) for (const c of g.cells) expect(hits(l, c.cell)).toBe(false)
  })

  it('lays out other paper sizes', () => {
    const a3 = computeSheet({ ...base, card, paper: PAPERS.A3, markLengthMm: 3.5 })
    expect([a3.pageW, a3.pageH].sort((x, y) => x - y)).toEqual([297, 420])
    expect(a3.perSheet).toBeGreaterThan(9)
    const letter = computeSheet({ ...base, card, paper: PAPERS.Letter, markLengthMm: 3.5 })
    expect(Math.min(letter.pageW, letter.pageH)).toBeCloseTo(215.9)
  })
})

describe('bleed marks', () => {
  const s = computeSheet({ ...base, gapMm: 2 })
  const all = {
    cutMarks: true,
    bleedMarks: true,
    guideLines: false,
    markLengthMm: 4,
    markOffsetMm: 2,
    markToEdge: false,
  }

  it('follow the bleed edges, which sit one bleed outside the cut lines', () => {
    const trim = edgeLines(s, 'trim')
    const bleed = edgeLines(s, 'bleed')
    expect(bleed.xs).toHaveLength(trim.xs.length)
    trim.xs.forEach((x, i) => expect(Math.abs(bleed.xs[i] - x)).toBeCloseTo(3))
    // Every bleed mark is on a bleed line.
    for (const l of cutMarks(s, { ...mark, edge: 'bleed' }))
      expect(bleed.xs.includes(l.x1) || bleed.ys.includes(l.y1)).toBe(true)
  })

  it('are dotted and, like the cut marks, never touch a card or its bleed', () => {
    const { marks } = sheetLines(s, all)
    const solid = cutMarks(s, mark)
    const dots = marks.slice(solid.length)
    expect(dots.length).toBeGreaterThan(solid.length * 2)
    for (const d of dots)
      expect(Math.hypot(d.x2 - d.x1, d.y2 - d.y1)).toBeLessThanOrEqual(0.6 + 1e-9)
    for (const l of marks) for (const c of s.cells) expect(hits(l, c.cell)).toBe(false)
  })

  it('can be printed on their own, and are left out with no bleed', () => {
    const only = sheetLines(s, { ...all, cutMarks: false })
    expect(only.marks.length).toBeGreaterThan(0)
    expect(only.marks.every((l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1) <= 0.6 + 1e-9)).toBe(true)
    const flush = computeSheet({ ...base, bleedMm: 0 })
    expect(sheetLines(flush, all).marks).toEqual(cutMarks(flush, mark))
  })

  it('reserve room on the sheet even without cut marks', () => {
    const none = computeSheet({ ...base, cutMarks: false })
    const bleedOnly = computeSheet({ ...base, cutMarks: false, bleedMarks: true })
    expect(bleedOnly.grid.x).toBeGreaterThan(none.grid.x - 1e-9)
  })

  it('dot a line from its start', () => {
    const d = dotted([{ x1: 0, y1: 0, x2: 0, y2: 3 }], 0.6, 0.9)
    expect(d.map((l) => [l.y1, l.y2])).toEqual([
      [0, 0.6],
      [1.5, 2.1],
    ])
  })

  it('add dotted guide lines at the bleed edges', () => {
    const g = sheetLines(s, { ...all, guideLines: true }).guides
    expect(g.length).toBeGreaterThan(guideLines(s).length)
  })
})
