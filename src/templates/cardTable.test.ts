import { describe, expect, it } from 'vitest'
import {
  createCard,
  createIconRow,
  createImageField,
  createTemplate,
  createText,
} from '@/core/model/factories'
import type { Asset, Template } from '@/core/model/types'
import { plainText, richTextFromPlain } from '@/core/text/richtext'
import { parseDelimited, toCsv } from '@/storage/sheetFiles'
import { mergeSettingsFor, tableColumns, tableRow, toCsvRows } from './cardTable'
import { planMerge } from './mailMerge'

const size = { presetId: 'id', widthMm: 54, heightMm: 86 }
const box = { xMm: 0, yMm: 0, wMm: 10, hMm: 10 }

function setup() {
  const front: Template = createTemplate('p', 'front', size, 'Creature', [
    createText(box, { name: 'Title', mergeColumn: 'E' }),
    createText(box, { name: 'Rules', mergeColumn: 'F', defaultText: richTextFromPlain('—') }),
    createImageField(box, { name: 'Art', mergeColumn: 'G' }),
    createIconRow(box, { name: 'Attack', mergeColumn: 'H' }),
  ])
  const spell: Template = createTemplate('p', 'front', size, 'Spell', [
    createText(box, { name: 'Title', mergeColumn: 'E' }),
    createText(box, { name: 'Effect' }),
  ])
  const back: Template = createTemplate('p', 'back', size, 'Basic back', [])
  const dragon = {
    id: 'a1',
    name: 'Dragon.png',
    mime: 'image/png',
    tags: [],
    createdAt: 0,
  } as unknown as Asset
  const templates = { [front.id]: front, [spell.id]: spell, [back.id]: back }
  const a = createCard('p', 0, front.id, back.id, 'Red Dragon')
  a.fields = {
    Title: { kind: 'text', text: richTextFromPlain('Red Dragon') },
    Rules: { kind: 'text', text: richTextFromPlain('Flies, "burns".\nTwice') },
    Art: { kind: 'image', assetId: 'a1', offsetXMm: 0, offsetYMm: 0, zoom: 1 },
    Attack: { kind: 'count', count: 3 },
  }
  const b = createCard('p', 1, spell.id, back.id, 'Bolt')
  b.fields = {
    Title: { kind: 'text', text: richTextFromPlain('Bolt') },
    Effect: {
      kind: 'text',
      text: { paragraphs: [{ runs: [{ text: 'Deal 3', style: { bold: true } }] }] },
    },
  }
  const ctx = { templates, assets: { a1: dragon }, copies: (id: string) => (id === a.id ? 2 : 1) }
  return { front, spell, back, dragon, a, b, ctx }
}

describe('card table', () => {
  it('puts columns at their merge letters, the rest in free letters', () => {
    const { a, b, ctx } = setup()
    const cols = tableColumns([a, b], ctx.templates)
    expect(cols.map((c) => `${c.letter}:${c.label}`)).toEqual([
      'A:Name',
      'B:Front template',
      'C:Back template',
      'D:Copies',
      'E:Title',
      'F:Rules',
      'G:Art',
      'H:Attack',
      'I:Effect',
    ])
    // Merge settings move the fixed columns; a clash goes to a free letter.
    const moved = tableColumns([a], ctx.templates, { nameColumn: 'C', copiesColumn: 'E' })
    expect(moved.slice(0, 4).map((c) => `${c.letter}:${c.label}`)).toEqual([
      'A:Front template',
      'B:Back template',
      'C:Name',
      'D:Title',
    ])
    expect(moved.find((c) => c.label === 'Copies')!.letter).toBe('E')
  })

  it('gives each card its values, defaults and editable flags', () => {
    const { a, b, ctx } = setup()
    const cols = tableColumns([a, b], ctx.templates)
    const ra = tableRow(a, cols, ctx)
    expect(ra.map((c) => c.value)).toEqual([
      'Red Dragon',
      'Creature',
      'Basic back',
      '2',
      'Red Dragon',
      'Flies, "burns".\nTwice',
      'Dragon.png',
      '3',
      '',
    ])
    expect(ra[8].has).toBe(false)
    const rb = tableRow(b, cols, ctx)
    expect(rb[5]).toMatchObject({ has: false })
    expect(rb[8]).toMatchObject({ value: 'Deal 3', editable: false })
    const empty = createCard('p', 2, a.frontTemplateId, null)
    expect(tableRow(empty, cols, ctx)[5]).toMatchObject({
      value: '',
      fallback: '—',
      editable: true,
    })
  })

  it('round-trips through CSV and mail merge', () => {
    const { a, b, ctx, dragon } = setup()
    const cols = tableColumns([a, b], ctx.templates)
    const csv = toCsv(toCsvRows([a, b], cols, ctx))
    expect(csv.startsWith('﻿Name,Front template,')).toBe(true)
    const table = parseDelimited(csv)
    expect(table).toHaveLength(3)
    const plan = planMerge(
      table,
      { ...mergeSettingsFor(cols), mode: 'add' },
      { templates: ctx.templates, assets: [dragon], cards: [] },
    )
    expect(plan.issues).toEqual([])
    const [pa, pb] = plan.cards
    expect(pa).toMatchObject({
      name: 'Red Dragon',
      frontTemplateId: a.frontTemplateId,
      backTemplateId: a.backTemplateId,
      copies: 2,
    })
    expect(Object.keys(pa.values).sort()).toEqual(['Art', 'Attack', 'Rules', 'Title'])
    const rules = pa.values.Rules
    expect(rules.kind === 'text' && plainText(rules.text)).toBe('Flies, "burns".\nTwice')
    expect(pa.values.Art).toMatchObject({ kind: 'image', assetId: 'a1' })
    expect(pa.values.Attack).toEqual({ kind: 'count', count: 3 })
    expect(pb).toMatchObject({ name: 'Bolt', frontTemplateId: b.frontTemplateId })
  })
})
