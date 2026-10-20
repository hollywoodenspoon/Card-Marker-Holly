import { describe, expect, it } from 'vitest'
import {
  area,
  bezierPoint,
  bounds,
  insertAnchor,
  nearestOnPath,
  pathData,
  removeAnchor,
  reverseSub,
  segments,
  snap45,
  transform,
  type SubPath,
} from './geometry'
import { buildShape, SHAPES } from './shapes'
import { isSmooth, parsePathData } from './svgPath'

const square: SubPath = {
  closed: true,
  anchors: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
}

describe('path geometry', () => {
  it('writes path data and measures bounds and area', () => {
    expect(pathData([square])).toBe('M0 0 L10 0 L10 10 L0 10 Z')
    const b = bounds([square])
    expect([b.x, b.y, b.w, b.h].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 10, 10])
    expect(area([square])).toBeCloseTo(100)
    expect(segments(square)).toHaveLength(4)
    expect(segments({ ...square, closed: false })).toHaveLength(3)
  })

  it('splits a segment without changing the curve', () => {
    const c = buildShape('ellipse', { x: 0, y: 0, w: 100, h: 50 })[0]
    const before = segments(c)[0].pts
    const mid = bezierPoint(before, 0.3)
    const split = insertAnchor(c, 0, 0.3)
    expect(split.anchors).toHaveLength(5)
    expect(split.anchors[1].x).toBeCloseTo(mid.x)
    expect(split.anchors[1].y).toBeCloseTo(mid.y)
    expect(area([split])).toBeCloseTo(area([c]), -1)
    expect(isSmooth(split.anchors[1])).toBe(true)
  })

  it('finds the nearest point, removes anchors and reverses', () => {
    const hit = nearestOnPath([square], { x: 5, y: -2 })!
    expect(hit.seg).toBe(0)
    expect(hit.point.x).toBeCloseTo(5)
    expect(hit.dist).toBeCloseTo(2)
    expect(removeAnchor(square, 1)!.anchors).toHaveLength(3)
    expect(removeAnchor({ closed: false, anchors: square.anchors.slice(0, 2) }, 0)).toBeNull()
    expect(reverseSub(square).anchors.map((a) => a.x)).toEqual([0, 10, 10, 0])
  })

  it('transforms anchors and handles', () => {
    const [moved] = transform(
      [{ closed: false, anchors: [{ x: 1, y: 1, hout: { x: 2, y: 0 } }] }],
      [2, 0, 0, 2, 10, 0],
    )
    expect(moved.anchors[0]).toEqual({ x: 12, y: 2, hout: { x: 4, y: 0 } })
    expect(snap45({ x: 0, y: 0 }, { x: 10, y: 1 })).toEqual({ x: expect.closeTo(10.05, 1), y: 0 })
  })
})

describe('svg path data', () => {
  it('parses lines, curves, relative commands and closes onto the first point', () => {
    const subs = parsePathData('M0 0 h10 v10 H0 z M20 20 c0 -5 10 -5 10 0 s10 5 10 0')
    expect(subs).toHaveLength(2)
    expect(subs[0]).toMatchObject({ closed: true })
    expect(subs[0].anchors).toHaveLength(4)
    expect(subs[1].anchors.map((a) => [a.x, a.y])).toEqual([
      [20, 20],
      [30, 20],
      [40, 20],
    ])
    // the S command mirrors the previous handle
    expect(subs[1].anchors[1].hout).toEqual({ x: 0, y: 5 })
  })

  it('turns arcs and quadratics into cubics', () => {
    const [circle] = parsePathData('M0 50 A50 50 0 1 1 100 50 A50 50 0 1 1 0 50 Z')
    expect(circle.closed).toBe(true)
    expect(area([circle])).toBeCloseTo(Math.PI * 2500, -1)
    const [q] = parsePathData('M0 0 Q50 100 100 0')
    expect(bounds([q]).h).toBeCloseTo(50, 0)
  })
})

describe('preset shapes', () => {
  it('builds every shape inside its box', () => {
    const box = { x: 10, y: 20, w: 200, h: 100 }
    for (const s of SHAPES) {
      const subs = buildShape(s.id, box)
      expect(subs.length, s.id).toBeGreaterThan(0)
      const b = bounds(subs)
      expect(b.x, s.id).toBeGreaterThanOrEqual(box.x - 0.5)
      expect(b.y, s.id).toBeGreaterThanOrEqual(box.y - 0.5)
      expect(b.x + b.w, s.id).toBeLessThanOrEqual(box.x + box.w + 0.5)
      expect(b.y + b.h, s.id).toBeLessThanOrEqual(box.y + box.h + 0.5)
      expect(subs.every((p) => p.closed) || !!s.open, s.id).toBe(true)
    }
  })

  it('follows shape settings', () => {
    const box = { x: 0, y: 0, w: 100, h: 100 }
    expect(buildShape('star', box, { points: 7 })[0].anchors).toHaveLength(14)
    expect(buildShape('polygon', box, { sides: 9 })[0].anchors).toHaveLength(9)
    expect(buildShape('gear', box, { teeth: 10, hole: 0 })).toHaveLength(1)
    expect(buildShape('frame', box)).toHaveLength(2)
  })
})
