import { describe, expect, it } from 'vitest'
import { pointInPaths } from './geometry'
import { buildShape } from './shapes'

describe('pointInPaths', () => {
  const box = { x: 10, y: 20, w: 100, h: 50 }
  it('knows inside from outside for a rectangle and an ellipse', () => {
    const rect = buildShape('rect', box)
    expect(pointInPaths(rect, { x: 50, y: 40 })).toBe(true)
    expect(pointInPaths(rect, { x: 5, y: 40 })).toBe(false)
    const ell = buildShape('ellipse', box)
    expect(pointInPaths(ell, { x: 60, y: 45 })).toBe(true)
    // The corner of the box is outside the ellipse.
    expect(pointInPaths(ell, { x: 12, y: 22 })).toBe(false)
  })
  it('treats a shape inside another as a hole (even-odd)', () => {
    const ring = [...buildShape('rect', { x: 0, y: 0, w: 100, h: 100 }), ...buildShape('rect', { x: 40, y: 40, w: 20, h: 20 })]
    expect(pointInPaths(ring, { x: 10, y: 10 })).toBe(true)
    expect(pointInPaths(ring, { x: 50, y: 50 })).toBe(false)
  })
  it('closes an open pen path for the test', () => {
    const tri = [{ closed: false, anchors: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }] }]
    expect(pointInPaths(tri, { x: 20, y: 20 })).toBe(true)
    expect(pointInPaths(tri, { x: 80, y: 80 })).toBe(false)
  })
})
