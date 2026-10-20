// @vitest-environment jsdom
import ImageTracer from 'imagetracerjs'
import { describe, expect, it } from 'vitest'
import { bounds } from '../geometry'
import { cornerColor, DEFAULT_TRACE, tracedLayer, tracerOptions } from './trace'

/** 40 × 20 white picture with a red square in the middle. */
function picture() {
  const w = 40
  const h = 20
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const red = x >= 15 && x < 25 && y >= 5 && y < 15
      data.set(red ? [220, 20, 30, 255] : [255, 255, 255, 255], i)
    }
  return { width: w, height: h, data }
}

describe('tracing', () => {
  it('maps settings to tracer options', () => {
    const o = tracerOptions({ ...DEFAULT_TRACE, colors: 40, detail: 10, smooth: 9 })
    expect(o.numberofcolors).toBe(16)
    expect(o.ltres).toBeCloseTo(0.2)
    expect(o.blurradius).toBe(5)
  })

  it('traces a picture into a layer fitted to the artboard, without the background', () => {
    const img = picture()
    const svg = ImageTracer.imagedataToSVG(
      img,
      tracerOptions({ ...DEFAULT_TRACE, colors: 2, smooth: 0, minArea: 0 }),
    )
    const bg = cornerColor(img)
    expect(bg).toBe('#ffffff')
    const layer = tracedLayer(svg, { width: 200, height: 200 }, 'Traced', bg)
    expect(layer.items.length).toBe(1)
    const b = bounds(layer.items[0].subpaths)
    // 40 × 20 fits 200 wide (×5), centred vertically: the square sits at 75..125, 75..125.
    expect(b.x).toBeCloseTo(75, -1)
    expect(b.y).toBeCloseTo(75, -1)
    expect(b.w).toBeCloseTo(50, -1)
    expect(layer.items[0].style.fill).toMatch(/^#d|^#e/)
    const all = tracedLayer(svg, { width: 200, height: 200 }, 'Traced', null)
    expect(all.items.length).toBeGreaterThan(1)
  })
})
