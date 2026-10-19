import { describe, expect, it } from 'vitest'
import { drawBand } from './bleedFill'
import type { PdfImage } from './drawTarget'
import { RecordingTarget } from './recordingTarget'

const img: PdfImage = {
  kind: 'raster',
  id: 'band',
  format: 'PNG',
  data: new Uint8Array(),
  widthPx: 10,
  heightPx: 10,
}

describe('drawBand', () => {
  it('clips to the bleed only (cell minus trim, opposite winding) before drawing', async () => {
    const t = new RecordingTarget()
    const cell = { x: 10, y: 20, w: 60, h: 92 }
    const trim = { x: 13, y: 23, w: 54, h: 86 }
    await drawBand(t, img, cell, trim, cell)
    const pts = t.ops.filter((o) => o.op === 'point').map((o) => [o.x, o.y])
    // outer clockwise, then inner counter-clockwise: the nonzero rule leaves a frame
    expect(pts).toEqual([
      [10, 20],
      [70, 20],
      [70, 112],
      [10, 112],
      [13, 23],
      [13, 109],
      [67, 109],
      [67, 23],
    ])
    const kinds = t.ops.map((o) => o.op).filter((k) => k !== 'point')
    expect(kinds).toEqual(['clip', 'image'])
    expect(t.ops.at(-1)).toMatchObject({ op: 'image', x: 10, y: 20, w: 60, h: 92 })
  })
})
