import { describe, expect, it } from 'vitest'
import { newDoc, newPath, type VectorDoc } from './model'
import { joinSubpaths, penIntent, removeLastPoint } from './pen'
import type { SubPath } from './geometry'

const open = (pts: [number, number][]): SubPath => ({
  closed: false,
  anchors: pts.map(([x, y]) => ({ x, y })),
})

function setup() {
  const doc: VectorDoc = newDoc()
  const drawing = newPath('d', [
    open([
      [0, 0],
      [100, 0],
      [100, 100],
    ]),
  ])
  const other = newPath('o', [
    open([
      [300, 300],
      [400, 300],
    ]),
  ])
  const square = newPath('s', [
    {
      closed: true,
      anchors: [
        { x: 200, y: 0 },
        { x: 250, y: 0 },
        { x: 250, y: 50 },
        { x: 200, y: 50 },
      ],
    },
  ])
  doc.layers[0].items.push(drawing, other, square)
  return { doc, drawing, other, square }
}

describe('pen intents', () => {
  it('while drawing: close, convert the last point, join, place', () => {
    const { doc, drawing, other } = setup()
    const ctx = { penPathId: drawing.id, selection: [drawing.id] }
    expect(penIntent(doc, ctx, { x: 2, y: 1 }, 5)).toEqual({
      kind: 'close',
      pathId: drawing.id,
      sub: 0,
    })
    expect(penIntent(doc, ctx, { x: 99, y: 101 }, 5)).toMatchObject({
      kind: 'convertLast',
      index: 2,
    })
    expect(penIntent(doc, ctx, { x: 401, y: 300 }, 5)).toEqual({
      kind: 'join',
      pathId: other.id,
      sub: 0,
      end: 'end',
    })
    expect(penIntent(doc, ctx, { x: 300, y: 302 }, 5)).toMatchObject({ kind: 'join', end: 'start' })
    expect(penIntent(doc, ctx, { x: 50, y: 60 }, 5)).toEqual({ kind: 'place' })
  })

  it('not drawing: continue an open end, delete or add on a selected path, else new', () => {
    const { doc, other, square } = setup()
    const ctx = { penPathId: null, selection: [square.id] }
    expect(penIntent(doc, ctx, { x: 400, y: 299 }, 5)).toEqual({
      kind: 'continue',
      pathId: other.id,
      sub: 0,
      end: 'end',
    })
    expect(penIntent(doc, ctx, { x: 250, y: 51 }, 5)).toEqual({
      kind: 'delete',
      pathId: square.id,
      sub: 0,
      index: 2,
    })
    expect(penIntent(doc, ctx, { x: 225, y: 2 }, 5)).toMatchObject({
      kind: 'add',
      pathId: square.id,
      seg: 0,
    })
    // Segments and anchors of paths that aren't selected are ignored.
    expect(penIntent(doc, { penPathId: null, selection: [] }, { x: 225, y: 2 }, 5)).toEqual({
      kind: 'new',
    })
    expect(penIntent(doc, { ...ctx, alt: true }, { x: 200, y: 0 }, 5)).toMatchObject({
      kind: 'convert',
      index: 0,
    })
  })

  it('skips hidden and locked paths', () => {
    const { doc, other } = setup()
    doc.layers[0].items[1].locked = true
    expect(penIntent(doc, { penPathId: null, selection: [] }, { x: 400, y: 300 }, 5)).toEqual({
      kind: 'new',
    })
    void other
  })
})

describe('pen helpers', () => {
  it('joins onto either end of another path', () => {
    const a = open([
      [0, 0],
      [10, 0],
    ])
    const b = open([
      [20, 0],
      [30, 0],
    ])
    expect(joinSubpaths(a, b, 'start').anchors.map((p) => p.x)).toEqual([0, 10, 20, 30])
    expect(joinSubpaths(a, b, 'end').anchors.map((p) => p.x)).toEqual([0, 10, 30, 20])
  })

  it('removes the last point and its dangling handle', () => {
    const s = removeLastPoint({
      closed: false,
      anchors: [
        { x: 0, y: 0 },
        { x: 5, y: 0, hout: { x: 2, y: 0 } },
        { x: 9, y: 0 },
      ],
    })!
    expect(s.anchors).toHaveLength(2)
    expect(s.anchors[1].hout).toBeUndefined()
    expect(removeLastPoint(open([[0, 0]]))).toBeNull()
  })
})
