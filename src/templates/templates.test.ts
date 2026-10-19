import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import {
  createCard,
  createIconRow,
  createImageField,
  createShape,
  createTemplate,
  createText,
} from '@/core/model/factories'
import type { Card, Template } from '@/core/model/types'
import type { RenderNode as RenderNodeLike } from '@/core/render/renderTypes'
import { richTextFromPlain, plainText } from '@/core/text/richtext'
import { setPartVisibility } from './overrides'
import { resolveSide } from './resolve'
import { saveCardAsTemplate } from './saveCardAsTemplate'
import { switchTemplate } from './switchTemplate'
import { migrateFieldRename } from './fields'
import { detachPreset } from './stylePresets'
import { exportTemplate, importTemplate } from './templateFile'

const size = { presetId: 'id', widthMm: 86, heightMm: 54 }

function setup() {
  const title = createText(
    { xMm: 5, yMm: 5, wMm: 40, hMm: 8 },
    { name: 'Title', defaultText: richTextFromPlain('Name') },
  )
  const gem = createShape({ xMm: 70, yMm: 5, wMm: 8, hMm: 8 }, { name: 'Rarity gem' })
  const flavor = createText({ xMm: 5, yMm: 40, wMm: 60, hMm: 8 }, { name: 'Flavor text' })
  const bg = createShape(
    { xMm: 0, yMm: 0, wMm: 86, hMm: 54 },
    { name: 'Background', toggleLocked: true },
  )
  const front = createTemplate('p', 'front', size, 'Creature', [bg, title, gem, flavor])
  const card = createCard('p', 1, front.id, null)
  return { front, card, title, gem, flavor, bg }
}

const ids = (nodes: RenderNodeLike[]) => nodes.map((n) => n.element.name)
const text = (nodes: RenderNodeLike[], name: string) =>
  plainText(nodes.find((n) => n.element.name === name)!.text!.text)

describe('resolveSide', () => {
  it('uses template defaults when the card has no values', () => {
    const { front, card } = setup()
    const nodes = resolveSide(front, card, 'front', 'card')
    expect(ids(nodes)).toEqual(['Background', 'Title', 'Rarity gem', 'Flavor text'])
    expect(text(nodes, 'Title')).toBe('Name')
  })

  it('shows card values for fields by name', () => {
    const { front, card } = setup()
    card.fields.Title = { kind: 'text', text: richTextFromPlain('Fire Drake') }
    expect(text(resolveSide(front, card, 'front', 'card'), 'Title')).toBe('Fire Drake')
  })

  it('hides a part per card without moving the others', () => {
    const { front, card, gem } = setup()
    setPartVisibility(card, gem, false)
    const nodes = resolveSide(front, card, 'front', 'card')
    expect(ids(nodes)).toEqual(['Background', 'Title', 'Flavor text'])
    const before = resolveSide(front, createCard('p', 2, front.id, null), 'front', 'card')
    const geo = (ns: RenderNodeLike[], n: string) => {
      const e = ns.find((x) => x.element.name === n)!.element
      return [e.xMm, e.yMm, e.wMm, e.hMm]
    }
    expect(geo(nodes, 'Flavor text')).toEqual(geo(before, 'Flavor text'))
    expect(geo(nodes, 'Title')).toEqual(geo(before, 'Title'))
  })

  it('stores only differences from the template', () => {
    const { card, gem } = setup()
    setPartVisibility(card, gem, false)
    expect(card.overrides).toEqual({ [gem.id]: { visible: false } })
    setPartVisibility(card, gem, true)
    expect(card.overrides).toEqual({})
  })

  it('ignores toggles on locked parts', () => {
    const { front, card, bg } = setup()
    setPartVisibility(card, bg, false)
    expect(card.overrides).toEqual({})
    card.overrides[bg.id] = { visible: false } // even if forced
    expect(ids(resolveSide(front, card, 'front', 'card'))).toContain('Background')
  })

  it('keeps per-card toggles after the template is edited (live update)', () => {
    const { front, card, gem, title } = setup()
    setPartVisibility(card, gem, false)
    const edited: Template = produce(front, (t) => {
      const ti = t.elements.find((e) => e.id === title.id)!
      ti.xMm = 12
      t.elements.push(createShape({ xMm: 1, yMm: 1, wMm: 2, hMm: 2 }, { name: 'New part' }))
    })
    const nodes = resolveSide(edited, card, 'front', 'card')
    expect(ids(nodes)).toEqual(['Background', 'Title', 'Flavor text', 'New part'])
    expect(nodes.find((n) => n.element.name === 'Title')!.element.xMm).toBe(12)
  })

  it('draws the card-only layer above the template', () => {
    const { front, card } = setup()
    card.local.front.push(createShape({ xMm: 0, yMm: 0, wMm: 5, hMm: 5 }, { name: 'Sticker' }))
    expect(ids(resolveSide(front, card, 'front', 'card')).at(-1)).toBe('Sticker')
    expect(ids(resolveSide(front, card, 'front', 'template'))).not.toContain('Sticker')
  })

  it('in template mode keeps hidden parts but dims them', () => {
    const { front, card, gem } = setup()
    const t = produce(
      front,
      (d) => void (d.elements.find((e) => e.id === gem.id)!.defaultVisible = false),
    )
    const nodes = resolveSide(t, card, 'front', 'template')
    expect(nodes.find((n) => n.element.id === gem.id)!.dimmed).toBe(true)
    expect(ids(resolveSide(t, card, 'front', 'card'))).not.toContain('Rarity gem')
  })

  it('hides children of a hidden group', () => {
    const { front, card } = setup()
    const g = {
      ...createShape({ xMm: 0, yMm: 0, wMm: 1, hMm: 1 }),
      type: 'group' as const,
      name: 'G',
      children: [createShape({ xMm: 0, yMm: 0, wMm: 1, hMm: 1 }, { name: 'Child' })],
    }
    const t = produce(front, (d) => void d.elements.push(g as never))
    setPartVisibility(card, t.elements.at(-1)!, false)
    expect(ids(resolveSide(t, card, 'front', 'card'))).not.toContain('G')
  })
})

describe('switchTemplate', () => {
  it('carries matching fields over and restores the rest when switching back', () => {
    const { front, card } = setup()
    card.fields.Title = { kind: 'text', text: richTextFromPlain('Fire Drake') }
    card.fields['Flavor text'] = { kind: 'text', text: richTextFromPlain('Hot.') }
    const spell = createTemplate('p', 'front', size, 'Spell', [
      createText({ xMm: 0, yMm: 0, wMm: 30, hMm: 8 }, { name: 'Title' }),
      createText({ xMm: 0, yMm: 10, wMm: 30, hMm: 8 }, { name: 'Effect' }),
    ])
    const next: Card = produce(card, (c) => switchTemplate(c, 'front', spell.id))
    const nodes = resolveSide(spell, next, 'front', 'card')
    expect(text(nodes, 'Title')).toBe('Fire Drake')
    expect(text(nodes, 'Effect')).toBe('Text') // default
    expect(next.fields['Flavor text']).toBeDefined() // kept on the card
    const back: Card = produce(next, (c) => switchTemplate(c, 'front', front.id))
    expect(text(resolveSide(front, back, 'front', 'card'), 'Flavor text')).toBe('Hot.')
  })
})

describe('migrateFieldRename', () => {
  it('moves values to the new name for cards using the template', () => {
    const { front, card } = setup()
    const other = createCard('p', 2, 'other', null)
    card.fields.Title = { kind: 'text', text: richTextFromPlain('A') }
    other.fields.Title = { kind: 'text', text: richTextFromPlain('B') }
    migrateFieldRename([card, other], front.id, 'Title', 'Name')
    expect(card.fields.Name).toBeDefined()
    expect(card.fields.Title).toBeUndefined()
    expect(other.fields.Title).toBeDefined()
  })
})

describe('saveCardAsTemplate', () => {
  it('bakes in the card values, visibility and its own layer with fresh ids', () => {
    const { front, card, gem } = setup()
    card.fields.Title = { kind: 'text', text: richTextFromPlain('Fire Drake') }
    setPartVisibility(card, gem, false)
    card.local.front.push(createShape({ xMm: 1, yMm: 1, wMm: 3, hMm: 3 }, { name: 'Sticker' }))
    const t = saveCardAsTemplate(card, 'front', front, 'Drake layout', size)
    expect(t.name).toBe('Drake layout')
    expect(t.elements.map((e) => e.name)).toEqual([
      'Background',
      'Title',
      'Rarity gem',
      'Flavor text',
      'Sticker',
    ])
    const title = t.elements[1]
    expect(title.type === 'text' && plainText(title.defaultText)).toBe('Fire Drake')
    expect(t.elements[2].defaultVisible).toBe(false)
    const oldIds = new Set([...front.elements, ...card.local.front].map((e) => e.id))
    expect(t.elements.some((e) => oldIds.has(e.id))).toBe(false)
  })

  it('uses the card image as the default art', () => {
    const art = createImageField({ xMm: 0, yMm: 0, wMm: 10, hMm: 10 }, { name: 'Art' })
    const tpl = createTemplate('p', 'front', size, 'T', [art])
    const card = createCard('p', 1, tpl.id, null)
    card.fields.Art = {
      kind: 'image',
      assetId: 'asset1',
      fit: 'fit',
      offsetXMm: 0,
      offsetYMm: 0,
      zoom: 1,
    }
    const t = saveCardAsTemplate(card, 'front', tpl, 'X', size)
    expect(t.elements[0]).toMatchObject({ defaultAssetId: 'asset1', fit: 'fit' })
  })
})

describe('template files', () => {
  it('round-trips a template with its images and remaps ids', async () => {
    const art = createImageField(
      { xMm: 0, yMm: 0, wMm: 10, hMm: 10 },
      { name: 'Art', defaultAssetId: 'a1' },
    )
    const tpl = createTemplate('p', 'front', size, 'Creature', [art])
    const asset = {
      id: 'a1',
      projectId: 'p',
      name: 'drake',
      mime: 'image/png',
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      widthPx: 1,
      heightPx: 1,
      isVector: false,
      tags: [],
      createdAt: 0,
    }
    const file = await exportTemplate(tpl, { a1: asset }, {})
    const json = JSON.parse(JSON.stringify(file))
    const imported = importTemplate(json, 'p2', [])
    expect(imported.template.projectId).toBe('p2')
    expect(imported.template.id).not.toBe(tpl.id)
    expect(imported.assets).toHaveLength(1)
    const newArt = imported.template.elements[0]
    expect(newArt.type === 'imageField' && newArt.defaultAssetId).toBe(imported.assets[0].id)
    expect(new Uint8Array(await imported.assets[0].blob.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    )
  })

  it('carries shared styles and symbol images, merging by name', async () => {
    const t = createText(
      { xMm: 0, yMm: 0, wMm: 40, hMm: 8 },
      { defaultText: richTextFromPlain('Deal {fire}') },
    )
    t.stylePresetId = 'p1'
    const tpl = createTemplate('p', 'front', size, 'Spell', [t])
    const flame = {
      id: 'fl',
      projectId: 'p',
      name: 'flame',
      mime: 'image/png',
      blob: new Blob([new Uint8Array([9])]),
      widthPx: 1,
      heightPx: 1,
      isVector: false,
      tags: ['fire'],
      createdAt: 0,
    }
    const presets = { p1: { id: 'p1', projectId: 'p', name: 'Rules', style: { sizePt: 7 } } }
    const file = JSON.parse(JSON.stringify(await exportTemplate(tpl, { fl: flame }, {}, presets)))
    expect(file.assets.map((a: { tags: string[] }) => a.tags)).toEqual([['fire']])
    // fresh project: preset and symbol are created
    const a = importTemplate(file, 'q', [])
    expect(a.stylePresets).toHaveLength(1)
    expect(a.template.elements[0].type === 'text' && a.template.elements[0].stylePresetId).toBe(
      a.stylePresets[0].id,
    )
    expect(a.assets).toHaveLength(1)
    // project that already has a "Rules" style and a {fire} symbol: both reused
    const b = importTemplate(file, 'q', [], {
      presets: [{ id: 'mine', projectId: 'q', name: 'Rules', style: {} }],
      assets: [{ ...flame, id: 'myflame', projectId: 'q' }],
    })
    expect(b.stylePresets).toHaveLength(0)
    expect(b.assets).toHaveLength(0)
    expect(b.template.elements[0].type === 'text' && b.template.elements[0].stylePresetId).toBe(
      'mine',
    )
  })

  it('rejects other files', () => {
    expect(() => importTemplate({ hello: 1 }, 'p', [])).toThrow()
  })
})

describe('card elements between template parts', () => {
  it('draws and saves them in the merged order', () => {
    const { front, card, title } = setup()
    card.local.front.push({
      ...createShape({ xMm: 0, yMm: 0, wMm: 5, hMm: 5 }, { name: 'Sticker' }),
      zBelow: title.id,
    })
    expect(ids(resolveSide(front, card, 'front', 'card'))).toEqual([
      'Background',
      'Sticker',
      'Title',
      'Rarity gem',
      'Flavor text',
    ])
    const t = saveCardAsTemplate(card, 'front', front, 'X', size)
    expect(t.elements.map((e) => e.name)).toEqual([
      'Background',
      'Sticker',
      'Title',
      'Rarity gem',
      'Flavor text',
    ])
    expect(t.elements[1].zBelow).toBeUndefined()
  })
})

describe('icon rows', () => {
  it('use the card count, carry it across templates, and bake it into saved templates', () => {
    const atk = createIconRow(
      { xMm: 0, yMm: 0, wMm: 40, hMm: 8 },
      { name: 'Attack', assetId: 'sword' },
    )
    const tpl = createTemplate('p', 'front', size, 'Creature', [atk])
    const card = createCard('p', 1, tpl.id, null)
    const count = (t: Template, c: Card) => resolveSide(t, c, 'front', 'card')[0].count
    expect(count(tpl, card)).toBe(3) // default
    card.fields.Attack = { kind: 'count', count: 5 }
    expect(count(tpl, card)).toBe(5)
    const other = createTemplate('p', 'front', size, 'Spell', [
      createIconRow({ xMm: 0, yMm: 0, wMm: 20, hMm: 8 }, { name: 'Attack', direction: 'vertical' }),
    ])
    expect(
      count(
        other,
        produce(card, (c) => switchTemplate(c, 'front', other.id)),
      ),
    ).toBe(5)
    const saved = saveCardAsTemplate(card, 'front', tpl, 'X', size)
    expect(saved.elements[0]).toMatchObject({ type: 'iconRow', defaultCount: 5, assetId: 'sword' })
  })
})

describe('style presets', () => {
  it('apply live over the base style, and per-character runs still win', () => {
    const t = createText({ xMm: 0, yMm: 0, wMm: 40, hMm: 8 }, { name: 'Title' })
    t.stylePresetId = 'p1'
    t.defaultText = {
      paragraphs: [{ runs: [{ text: 'A' }, { text: 'B', style: { color: '#00ff00' } }] }],
    }
    const tpl = createTemplate('p', 'front', size, 'T', [t])
    const card = createCard('p', 1, tpl.id, null)
    const presets = {
      p1: {
        id: 'p1',
        projectId: 'p',
        name: 'Heading',
        style: { fontFamily: 'Alegreya SC', color: '#ff0000' },
      },
    }
    const [n] = resolveSide(tpl, card, 'front', 'card', presets)
    expect(n.element.type === 'text' && n.element.baseStyle).toMatchObject({
      fontFamily: 'Alegreya SC',
      color: '#ff0000',
    })
    expect(n.text!.text.paragraphs[0].runs[1].style).toEqual({ color: '#00ff00' })
    // a missing preset falls back to the base style
    const [m] = resolveSide(tpl, card, 'front', 'card', {})
    expect(m.element.type === 'text' && m.element.baseStyle.fontFamily).toBe('Inter')
  })

  it('deleting a preset bakes its values into linked texts', () => {
    const t = createText({ xMm: 0, yMm: 0, wMm: 40, hMm: 8 })
    t.stylePresetId = 'p1'
    const other = createText({ xMm: 0, yMm: 0, wMm: 40, hMm: 8 })
    const els = [t, other]
    detachPreset(els, { id: 'p1', projectId: 'p', name: 'H', style: { sizePt: 20, bold: true } })
    expect(t.stylePresetId).toBeUndefined()
    expect(t.baseStyle).toMatchObject({ sizePt: 20, bold: true })
    expect(other.baseStyle.sizePt).toBe(10)
  })
})
