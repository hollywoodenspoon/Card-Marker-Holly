import { describe, expect, it } from 'vitest'
import { createShape } from './factories'
import { mergeLayers, placeLocal, stepLocal } from './layering'
import type { Element } from './types'

const box = { xMm: 0, yMm: 0, wMm: 1, hMm: 1 }
const t = (name: string) => createShape(box, { name })
const order = (tpl: Element[], loc: Element[]) => mergeLayers(tpl, loc).map((l) => l.el.name)

function setup() {
  const bg = t('Background')
  const art = t('Art')
  const title = t('Title')
  return { tpl: [bg, art, title], bg, art, title }
}

describe('layering', () => {
  it('puts card elements on top by default', () => {
    const { tpl } = setup()
    expect(order(tpl, [t('Sticker')])).toEqual(['Background', 'Art', 'Title', 'Sticker'])
  })

  it('places a card element directly below its anchor', () => {
    const { tpl, art } = setup()
    const s = { ...t('Sticker'), zBelow: art.id }
    expect(order(tpl, [s])).toEqual(['Background', 'Sticker', 'Art', 'Title'])
  })

  it('falls back to the top when the anchor is gone', () => {
    const { tpl } = setup()
    const s = { ...t('Sticker'), zBelow: 'deleted' }
    expect(order(tpl, [s])).toEqual(['Background', 'Art', 'Title', 'Sticker'])
  })

  it('moves a card element between template parts and under the bottom one', () => {
    const { tpl, art, bg } = setup()
    const s = t('Sticker')
    let loc = placeLocal([s], tpl, s.id, 1) // between Background and Art
    expect(order(tpl, loc)).toEqual(['Background', 'Sticker', 'Art', 'Title'])
    expect(s.zBelow).toBe(art.id)
    loc = placeLocal(loc, tpl, s.id, 0)
    expect(order(tpl, loc)).toEqual(['Sticker', 'Background', 'Art', 'Title'])
    expect(s.zBelow).toBe(bg.id)
    loc = placeLocal(loc, tpl, s.id, 99)
    expect(order(tpl, loc)).toEqual(['Background', 'Art', 'Title', 'Sticker'])
    expect(s.zBelow).toBeUndefined()
  })

  it('keeps the order of several card elements', () => {
    const { tpl } = setup()
    const a = t('A')
    const b = t('B')
    let loc: Element[] = [a, b]
    loc = placeLocal(loc, tpl, b.id, 1)
    loc = placeLocal(loc, tpl, a.id, 1) // below B
    expect(order(tpl, loc)).toEqual(['Background', 'A', 'B', 'Art', 'Title'])
  })

  it('steps through template parts', () => {
    const { tpl } = setup()
    const s = t('Sticker')
    let loc: Element[] = [s]
    loc = stepLocal(loc, tpl, s.id, 'backward')
    expect(order(tpl, loc)).toEqual(['Background', 'Art', 'Sticker', 'Title'])
    loc = stepLocal(loc, tpl, s.id, 'back')
    expect(order(tpl, loc)).toEqual(['Sticker', 'Background', 'Art', 'Title'])
    loc = stepLocal(loc, tpl, s.id, 'forward')
    expect(order(tpl, loc)).toEqual(['Background', 'Sticker', 'Art', 'Title'])
    loc = stepLocal(loc, tpl, s.id, 'front')
    expect(order(tpl, loc)).toEqual(['Background', 'Art', 'Title', 'Sticker'])
  })
})
