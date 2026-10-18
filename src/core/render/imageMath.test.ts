import { describe, expect, it } from 'vitest'
import { centreCrop, croppedImageDpi, dpiFromMmPerPx, framePlacement } from './imageMath'

describe('image math', () => {
  it('fills a frame and centres the image', () => {
    // 2000×1000 image in a 50×50 frame: fill scales by height
    const p = framePlacement(50, 50, 2000, 1000, {
      fit: 'fill',
      offsetXMm: 0,
      offsetYMm: 0,
      zoom: 1,
    })
    expect(p.h).toBeCloseTo(50)
    expect(p.w).toBeCloseTo(100)
    expect(p.x).toBeCloseTo(-25)
    expect(p.y).toBeCloseTo(0)
  })

  it('fits inside a frame', () => {
    const p = framePlacement(50, 50, 2000, 1000, {
      fit: 'fit',
      offsetXMm: 0,
      offsetYMm: 0,
      zoom: 1,
    })
    expect(p.w).toBeCloseTo(50)
    expect(p.y).toBeCloseTo(12.5)
  })

  it('applies zoom and offset', () => {
    const p = framePlacement(50, 50, 1000, 1000, {
      fit: 'fill',
      offsetXMm: 5,
      offsetYMm: -2,
      zoom: 2,
    })
    expect(p.w).toBeCloseTo(100)
    expect(p.x).toBeCloseTo(-25 + 5)
    expect(p.y).toBeCloseTo(-25 - 2)
  })

  it('computes effective DPI', () => {
    expect(croppedImageDpi(25.4, 25.4, 300, 300)).toBeCloseTo(300)
    expect(croppedImageDpi(25.4, 25.4, 600, 600, { x: 0, y: 0, w: 0.5, h: 0.5 })).toBeCloseTo(300)
    expect(dpiFromMmPerPx(25.4 / 150)).toBeCloseTo(150)
  })

  it('centre-crops to an aspect ratio', () => {
    expect(centreCrop(10, 10, 200, 100)).toEqual({ x: 0.25, y: 0, w: 0.5, h: 1 })
    expect(centreCrop(20, 10, 100, 100)).toEqual({ x: 0, y: 0.25, w: 1, h: 0.5 })
  })
})
