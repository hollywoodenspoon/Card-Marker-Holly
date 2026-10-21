import { describe, expect, it } from 'vitest'
import { createIconRow, createProject, createText } from '@/core/model/factories'
import { richTextFromPlain } from '@/core/text/richtext'
import { packFieldValues } from './exportPack'

describe('game pack field values', () => {
  it('takes text as plain text and icon rows as numbers, by field name', () => {
    const { templates, cards } = createProject()
    const front = templates[0]
    front.elements.push(
      createIconRow({ xMm: 0, yMm: 0, wMm: 20, hMm: 5 }, { name: 'FS_AS', defaultCount: 1 }),
      {
        ...createText({ xMm: 0, yMm: 0, wMm: 20, hMm: 5 }, { name: 'Fate_AS' }),
        defaultVisible: false,
      },
    )
    const card = cards[0]
    card.fields.Title = { kind: 'text', text: richTextFromPlain('Crimson Duelist') }
    card.fields.FS_AS = { kind: 'count', count: 2 }
    card.fields.Fate_AS = { kind: 'text', text: richTextFromPlain('123') }
    const t = Object.fromEntries(templates.map((x) => [x.id, x]))
    const v = packFieldValues(card, t)
    expect(v.Title).toBe('Crimson Duelist')
    expect(v.FS_AS).toBe(2)
    // A hidden layer's field is still exported.
    expect(v.Fate_AS).toBe('123')
    expect(Object.values(v).every((x) => typeof x === 'string' || typeof x === 'number')).toBe(true)
  })
})
