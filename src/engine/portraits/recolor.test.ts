import { describe, expect, it } from 'vitest'
import { hexToRgb, huePixel, rampPixel, recolorPixels, rgbToHsl } from './recolor'

describe('portrait recolouring', () => {
  it('reads hex colours', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0])
    expect(hexToRgb('#0f0')).toEqual([0, 255, 0])
  })

  it('ramp: mid grey is the colour, black stays black, white stays white', () => {
    const c = hexToRgb('#3366cc')
    const mid = rampPixel(128, 128, 128, c)
    mid.forEach((v, i) => expect(Math.abs(v - c[i])).toBeLessThanOrEqual(1))
    expect(rampPixel(0, 0, 0, c)).toEqual([0, 0, 0])
    expect(rampPixel(255, 255, 255, c)).toEqual([255, 255, 255])
  })

  it('ramp keeps shading: darker greys stay darker', () => {
    const c = hexToRgb('#c08060')
    const dark = rampPixel(60, 60, 60, c)
    const light = rampPixel(200, 200, 200, c)
    expect(dark[0]).toBeLessThan(c[0])
    expect(light[0]).toBeGreaterThan(c[0])
  })

  it('hue: takes the hue, keeps lightness', () => {
    const out = huePixel(200, 40, 40, hexToRgb('#2040ff'))
    const [h, , l] = rgbToHsl(...out)
    const [h0] = rgbToHsl(32, 64, 255)
    expect(Math.abs(h - h0)).toBeLessThan(0.01)
    expect(Math.abs(l - rgbToHsl(200, 40, 40)[2])).toBeLessThan(0.01)
  })

  it('skips transparent pixels and leaves alpha alone', () => {
    const px = new Uint8ClampedArray([128, 128, 128, 0, 128, 128, 128, 200])
    recolorPixels(px, 'ramp', '#ff0000')
    expect([...px.slice(0, 4)]).toEqual([128, 128, 128, 0])
    expect(px[4]).toBeGreaterThan(250)
    expect(px[7]).toBe(200)
  })
})
