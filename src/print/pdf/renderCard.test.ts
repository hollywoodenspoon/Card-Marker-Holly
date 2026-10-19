import { describe, expect, it } from 'vitest'
import { createImage, createShape, createText } from '@/core/model/factories'
import type { Element, TextStyle } from '@/core/model/types'
import type { RenderNode } from '@/core/render/renderTypes'
import { richTextFromPlain } from '@/core/text/richtext'
import type { Measurer } from '@/core/text/measure'
import { PAPERS } from '../paper'
import { backCells, computeSheet } from '../layout'
import { RecordingTarget } from './recordingTarget'
import { renderCard, type PrintResources } from './renderCard'

const measurer: Measurer = {
  width: (t: string, _s: TextStyle, size: number) => [...t].length * size * 0.5,
  metrics: (_s, size) => ({ ascent: size * 0.8, descent: size * 0.2 }),
}

const texts: { text: string; x: number; baseline: number }[] = []
const res: PrintResources = {
  measurer,
  image: async (id) => ({
    kind: 'raster',
    id,
    format: 'PNG',
    data: new Uint8Array(),
    widthPx: 200,
    heightPx: 100,
  }),
  info: () => ({ widthPx: 200, heightPx: 100, isVector: false }),
  text: async (_t, f, x, baseline) => {
    texts.push({ text: f.text, x, baseline })
  },
}

const node = (el: Element, extra: Partial<RenderNode> = {}): RenderNode => ({
  element: el,
  source: 'template',
  dimmed: false,
  ...extra,
})
const sheet = computeSheet({
  paper: PAPERS.A4,
  card: { w: 86, h: 54 },
  bleedMm: 3,
  marginMm: 5,
  orientation: 'auto',
  cutMarks: true,
  markLengthMm: 4,
  markOffsetMm: 2,
})

describe('renderCard', () => {
  it('clips to the bleed box and places the card at the trim corner', async () => {
    const t = new RecordingTarget()
    const bg = createShape({ xMm: -3, yMm: -3, wMm: 92, hMm: 60 }, { fill: '#123456' })
    const c = sheet.cells[3]
    await renderCard(t, [node(bg)], c.cell, c.trim, res)
    const rects = t.ops.filter((o) => o.op === 'rect')
    expect(rects[0]).toEqual({ op: 'rect', ...c.cell }) // clip
    // background covers the bleed exactly (rounded-rect path with radius 0 → rect)
    expect(rects[1]).toMatchObject({ x: c.cell.x, y: c.cell.y, w: 92, h: 60 })
    expect(t.ops.find((o) => o.op === 'fill')).toMatchObject({ color: '#123456', alpha: 1 })
  })

  it('lands backs on the mirrored cell', async () => {
    const t = new RecordingTarget()
    const b = backCells(sheet, 'long')[0]
    await renderCard(
      t,
      [node(createShape({ xMm: 0, yMm: 0, wMm: 86, hMm: 54 }))],
      b.cell,
      b.trim,
      res,
    )
    const r = t.ops.filter((o) => o.op === 'rect')[1]
    expect(r).toMatchObject({ x: 210 - 16 - 86, y: 31.5, w: 86, h: 54 })
  })

  it('rotates around the element corner and applies opacity', async () => {
    const t = new RecordingTarget()
    const el = createShape({ xMm: 10, yMm: 10, wMm: 20, hMm: 10 }, { rotation: 90, opacity: 0.5 })
    const c = sheet.cells[0]
    await renderCard(t, [node(el)], c.cell, c.trim, res)
    const r = t.ops.filter((o) => o.op === 'rect')[1]
    // rotated 90° clockwise about (10,10): spans x 0..10, y 10..30 in card mm
    expect(
      r.op === 'rect' &&
        [r.x - c.trim.x, r.y - c.trim.y, r.w, r.h].map((v) => Math.round(v * 1e6) / 1e6),
    ).toEqual([0, 10, 10, 20])
    expect(t.ops.find((o) => o.op === 'fill')).toMatchObject({ alpha: 0.5 })
  })

  it('draws a cropped image so the crop window fills the box', async () => {
    const t = new RecordingTarget()
    const img = createImage({ xMm: 0, yMm: 0, wMm: 40, hMm: 20 }, 'a', {
      crop: { x: 0.5, y: 0, w: 0.5, h: 1 },
    })
    const c = sheet.cells[0]
    await renderCard(t, [node(img)], c.cell, c.trim, res)
    const drawn = t.ops.find((o) => o.op === 'image')!
    expect(drawn).toMatchObject({ x: c.trim.x - 40, y: c.trim.y, w: 80, h: 20 })
  })

  it('places text on the same lines as the canvas layout', async () => {
    texts.length = 0
    const t = new RecordingTarget()
    const el = createText(
      { xMm: 5, yMm: 5, wMm: 40, hMm: 20 },
      { defaultText: richTextFromPlain('Hello'), autoShrink: { enabled: false, minPt: 5 } },
    )
    const c = sheet.cells[0]
    await renderCard(
      t,
      [node(el, { text: { kind: 'text', text: el.defaultText } })],
      c.cell,
      c.trim,
      res,
    )
    expect(texts).toHaveLength(1)
    const size = (10 * 25.4) / 72
    // baseline: half leading (0.1·size) + ascent (0.8·size)
    expect(texts[0].x).toBeCloseTo(0)
    expect(texts[0].baseline).toBeCloseTo(size * 0.9)
  })

  it('skips empty art boxes', async () => {
    const t = new RecordingTarget()
    const { createImageField } = await import('@/core/model/factories')
    const f = createImageField({ xMm: 0, yMm: 0, wMm: 30, hMm: 30 })
    const c = sheet.cells[0]
    await renderCard(
      t,
      [node(f, { image: { kind: 'image', offsetXMm: 0, offsetYMm: 0, zoom: 1 } })],
      c.cell,
      c.trim,
      res,
    )
    expect(t.ops.some((o) => o.op === 'image' || o.op === 'fill')).toBe(false)
  })
})
