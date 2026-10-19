import { describe, expect, it } from 'vitest'
import { createGroup, createImageField, createShape, createText } from '@/core/model/factories'
import type { Element } from '@/core/model/types'
import type { RenderNode } from '@/core/render/renderTypes'
import { stripArt, toGrey } from './draft'

const box = { xMm: 0, yMm: 0, wMm: 1, hMm: 1 }
const node = (element: Element, children?: RenderNode[]): RenderNode => ({
  element,
  source: 'template',
  dimmed: false,
  children,
})

describe('draft print', () => {
  it('turns colours into their luminance grey', () => {
    expect(toGrey('#ffffff')).toBe('#ffffff')
    expect(toGrey('#000')).toBe('#000000')
    expect(toGrey('#ff0000')).toBe('#4c4c4c')
    expect(toGrey('not a colour')).toBe('not a colour')
  })

  it('leaves out art boxes and pictures, also inside groups, and caches the result', () => {
    const art = createImageField(box)
    const nodes = [
      node(createShape(box, { name: 'Frame' })),
      node(art),
      node(createGroup([art], 'G'), [node(art), node(createText(box, { name: 'T' }))]),
    ]
    const out = stripArt(nodes)
    expect(out.map((n) => n.element.name)).toEqual(['Frame', 'G'])
    expect(out[1].children!.map((n) => n.element.name)).toEqual(['T'])
    expect(stripArt(nodes)).toBe(out)
  })
})
