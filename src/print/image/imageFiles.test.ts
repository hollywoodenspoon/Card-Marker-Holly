import { describe, expect, it } from 'vitest'
import { createCard } from '@/core/model/factories'
import { imageFiles, imagePx, jpegWithDpi, pngWithDpi } from './imageFiles'

const card = (name: string, order: number) => createCard('p', order, null, null, name)

describe('image files', () => {
  it('makes one file per card, side, bleed and format, named in card order', () => {
    const files = imageFiles([card('Goblin', 2), card('Dragon', 1)], {
      sides: ['front', 'back'],
      bleeds: [false, true],
      formats: ['png', 'jpg'],
      dpi: 300,
    })
    expect(files).toHaveLength(2 * 2 * 2 * 2)
    expect(files[0].name).toBe('01 Dragon - front.png')
    expect(files[3].name).toBe('01 Dragon - front (bleed).jpg')
    expect(files[8].name).toBe('02 Goblin - front.png')
    expect(new Set(files.map((f) => f.name)).size).toBe(files.length)
  })

  it('names a single card without a number and strips unsafe characters', () => {
    const [f] = imageFiles([card('Fire/Ice: "Bolt"', 1)], {
      sides: ['front'],
      bleeds: [true],
      formats: ['webp'],
      dpi: 300,
    })
    expect(f.name).toBe('FireIce Bolt - front (bleed).webp')
  })
})

describe('image size', () => {
  it('is the exact mm size at the chosen DPI', () => {
    // 54 × 86 mm at 300 dpi = 637.8 × 1015.7 px; 3 mm bleed = 35.4 px
    expect(imagePx({ w: 54, h: 86 }, 3, false, 300)).toEqual({
      W: 638,
      H: 1016,
      B: 0,
      width: 638,
      height: 1016,
    })
    expect(imagePx({ w: 54, h: 86 }, 3, true, 300)).toMatchObject({
      B: 35,
      width: 708,
      height: 1086,
    })
  })
})

describe('dpi metadata', () => {
  // smallest valid PNG: signature, IHDR, IDAT, IEND (contents don't matter here)
  const chunk = (type: string, data: number[]) => {
    const len = [0, 0, 0, data.length]
    return [...len, ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0]
  }
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  const png = new Uint8Array([
    ...signature,
    ...chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
    ...chunk('IDAT', [1, 2, 3]),
    ...chunk('IEND', []),
  ])

  it('adds a pHYs chunk after IHDR in pixels per metre', () => {
    const out = pngWithDpi(png, 300)
    const at = 8 + 12 + 13
    const v = new DataView(out.buffer)
    expect(String.fromCharCode(...out.subarray(at + 4, at + 8))).toBe('pHYs')
    expect(v.getUint32(at + 8)).toBe(11811) // 300 dpi
    expect(out[at + 16]).toBe(1)
    // CRC of "pHYs" + data, same value as zlib.crc32
    expect(v.getUint32(at + 17)).toBe(0x78a53f76)
    // running it again replaces rather than duplicates
    expect(pngWithDpi(out, 300).length).toBe(out.length)
  })

  it('sets JFIF density in dots per inch', () => {
    const jfif = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    ])
    const out = jpegWithDpi(jfif, 300)
    expect([...out.subarray(13, 18)]).toEqual([1, 1, 44, 1, 44])
    const notJfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 0])
    expect(jpegWithDpi(notJfif, 300)).toEqual(notJfif)
  })
})
