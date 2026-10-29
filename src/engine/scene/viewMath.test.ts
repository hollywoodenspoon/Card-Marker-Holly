import { describe, expect, it } from 'vitest'
import { clampFov, cubeDirection, distanceForFov, gameOffset, viewHeight } from './viewMath'

describe('view maths', () => {
  it('keeps the framing when the FOV changes', () => {
    const d = distanceForFov(20, 50, 25)
    expect(viewHeight(d, 25)).toBeCloseTo(viewHeight(20, 50), 6)
    expect(d).toBeGreaterThan(20) // a narrower FOV backs the camera off
    expect(distanceForFov(20, 50, 50)).toBeCloseTo(20)
  })

  it('clamps and rounds the FOV to the slider range', () => {
    expect(clampFov(3)).toBe(10)
    expect(clampFov(500)).toBe(120)
    expect(clampFov(47.6)).toBe(48)
  })

  it('turns the Game camera in 90° steps around the diagonals', () => {
    const a = gameOffset(0, 0.5, 10)
    const b = gameOffset(1, 0.5, 10)
    // Same height and distance, a quarter turn apart.
    expect(a[1]).toBeCloseTo(b[1])
    expect(Math.hypot(...a)).toBeCloseTo(10)
    const dot = a[0] * b[0] + a[2] * b[2]
    expect(dot).toBeCloseTo(0, 6)
    // yaw wraps: 4 is 0, −1 is 3
    expect(gameOffset(4, 0.5, 10)).toEqual(gameOffset(0, 0.5, 10))
    gameOffset(-1, 0.5, 10).forEach((v, i) => expect(v).toBeCloseTo(gameOffset(3, 0.5, 10)[i]))
    // higher tilt = steeper
    expect(gameOffset(0, 1, 10)[1]).toBeGreaterThan(gameOffset(0, 0, 10)[1])
  })

  it('snaps view-cube hits to faces, edges and corners', () => {
    expect(cubeDirection([0.1, 0.5, -0.05])).toEqual([0, 1, 0]) // top face
    const edge = cubeDirection([0.45, 0.5, 0])
    expect(edge[0]).toBeCloseTo(Math.SQRT1_2)
    expect(edge[1]).toBeCloseTo(Math.SQRT1_2)
    const corner = cubeDirection([0.5, 0.48, 0.46])
    corner.forEach((c) => expect(c).toBeCloseTo(1 / Math.sqrt(3)))
  })
})
