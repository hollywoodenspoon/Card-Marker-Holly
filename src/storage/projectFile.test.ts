import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createIconRow, createImage, createProject, createText } from '@/core/model/factories'
import { flatten } from '@/core/model/tree'
import type { Asset, FontAsset, StylePreset } from '@/core/model/types'
import { CardMakerDB } from './db'
import { exportProject, importProject } from './projectFile'
import { loadProject, saveProjectBundle } from './repo'

function sample() {
  const b = createProject('Dragons')
  const pid = b.project.id
  const art: Asset = {
    id: 'a-art',
    projectId: pid,
    name: 'art',
    mime: 'image/png',
    blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }),
    widthPx: 2,
    heightPx: 2,
    isVector: false,
    tags: [],
    createdAt: 0,
  }
  const fire: Asset = {
    ...art,
    id: 'a-fire',
    name: 'fire',
    tags: ['fire'],
    blob: new Blob([new Uint8Array([7])], { type: 'image/png' }),
  }
  const font: FontAsset = {
    id: 'f1',
    projectId: pid,
    family: 'Cinzel',
    weight: '400',
    style: 'normal',
    fileName: 'Cinzel.ttf',
    blob: new Blob([new Uint8Array([9, 9])]),
    createdAt: 0,
  }
  const preset: StylePreset = {
    id: 'p1',
    projectId: pid,
    name: 'Heading',
    style: { fontFamily: 'Cinzel' },
  }
  const front = b.templates[0]
  const title = flatten(front.elements).find((e) => e.name === 'Title')!
  if (title.type === 'text') title.stylePresetId = 'p1'
  front.elements.push(
    createIconRow({ xMm: 0, yMm: 0, wMm: 20, hMm: 5 }, { name: 'Attack', assetId: 'a-fire' }),
  )
  const card = b.cards[0]
  card.fields.Art = { kind: 'image', assetId: 'a-art', offsetXMm: 1, offsetYMm: 0, zoom: 1.5 }
  card.fields.Attack = { kind: 'count', count: 4 }
  card.overrides[title.id] = { visible: false }
  const sticker = createImage({ xMm: 1, yMm: 1, wMm: 5, hMm: 5 }, 'a-art', { zBelow: title.id })
  card.local.front.push(
    sticker,
    createText({ xMm: 0, yMm: 0, wMm: 10, hMm: 5 }, { stylePresetId: 'p1' }),
  )
  b.project.print = { ...b.project.print, copies: { [card.id]: 3 }, order: [card.id] }
  return {
    doc: {
      project: b.project,
      templates: Object.fromEntries(b.templates.map((t) => [t.id, t])),
      cards: { [card.id]: card },
      stylePresets: { p1: preset },
    },
    library: { assets: { [art.id]: art, [fire.id]: fire }, fonts: { f1: font } },
    title,
  }
}

describe('project files', () => {
  it('round-trips a project as a new one with every reference remapped', async () => {
    const { doc, library, title } = sample()
    const file = JSON.parse(JSON.stringify(await exportProject(doc, library)))
    const b = importProject(file, ' (copy)')

    expect(b.project.id).not.toBe(doc.project.id)
    expect(b.project.name).toBe('Dragons (copy)')
    const tplIds = new Set(b.templates.map((t) => t.id))
    const assetIds = new Set(b.assets.map((a) => a.id))
    const presetIds = new Set(b.stylePresets.map((p) => p.id))
    // no old row ids survive
    for (const t of Object.keys(doc.templates)) expect(tplIds.has(t)).toBe(false)
    expect(assetIds.has('a-art') || presetIds.has('p1')).toBe(false)
    // every reference points at an imported row
    const [card] = b.cards
    expect(tplIds.has(card.frontTemplateId!) && tplIds.has(card.backTemplateId!)).toBe(true)
    const f = card.fields.Art
    expect(f.kind === 'image' && assetIds.has(f.assetId!)).toBe(true)
    expect(card.fields.Attack).toEqual({ kind: 'count', count: 4 })
    expect(b.project.print.copies).toEqual({ [card.id]: 3 })
    expect(b.project.print.order).toEqual([card.id])
    for (const el of [
      ...b.templates.flatMap((t) => flatten(t.elements)),
      ...flatten(card.local.front),
    ]) {
      if (el.type === 'image' || (el.type === 'iconRow' && el.assetId))
        expect(assetIds.has(el.assetId!)).toBe(true)
      if (el.type === 'text' && el.stylePresetId) expect(presetIds.has(el.stylePresetId)).toBe(true)
    }
    // element ids are kept, so toggles and anchors still match
    expect(card.overrides[title.id]).toEqual({ visible: false })
    expect(card.local.front[0].zBelow).toBe(title.id)
    // everything belongs to the new project, blobs byte-identical
    for (const row of [...b.templates, ...b.cards, ...b.assets, ...b.fonts, ...b.stylePresets])
      expect(row.projectId).toBe(b.project.id)
    const art = b.assets.find((a) => a.name === 'art')!
    expect(new Uint8Array(await art.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]))
    expect(b.assets.find((a) => a.name === 'fire')!.tags).toEqual(['fire'])
    expect(b.fonts[0]).toMatchObject({ family: 'Cinzel', weight: '400' })
  })

  it('saves an imported project and loads it back', async () => {
    const { doc, library } = sample()
    const b = importProject(JSON.parse(JSON.stringify(await exportProject(doc, library))))
    const database = new CardMakerDB('project-file-test')
    await saveProjectBundle(b, database)
    const loaded = await loadProject(b.project.id, database)
    expect(Object.keys(loaded!.doc.templates)).toHaveLength(2)
    expect(Object.keys(loaded!.doc.stylePresets)).toHaveLength(1)
    expect(Object.keys(loaded!.library.assets)).toHaveLength(2)
  })

  it('rejects other files', () => {
    expect(() => importProject({ format: 'card-maker-template', version: 1 })).toThrow(
      /not a Card Maker project/,
    )
    expect(() => importProject(null)).toThrow()
  })
})
