import { describe, expect, it } from 'vitest'
import { createCard, createTemplate, createText } from '@/core/model/factories'
import { richTextFromPlain } from '@/core/text/richtext'
import { proofFields } from './proofread'

const size = { presetId: 'id', widthMm: 54, heightMm: 86 }
const box = { xMm: 0, yMm: 0, wMm: 10, hMm: 10 }

describe('proofreading fields', () => {
  it('lists front then back text fields once, with own or default text', () => {
    const f = createTemplate('p', 'front', size, 'F', [
      createText(box, { name: 'Title', defaultText: richTextFromPlain('Name') }),
      createText(box, { name: 'Rules', defaultText: richTextFromPlain('Rules here') }),
    ])
    const b = createTemplate('p', 'back', size, 'B', [
      createText(box, { name: 'Title', defaultText: richTextFromPlain('x') }),
      createText(box, { name: 'Flavour', defaultText: richTextFromPlain('Lore') }),
    ])
    const c = createCard('p', 1, f.id, b.id)
    c.fields.Title = { kind: 'text', text: richTextFromPlain('Goblin') }
    c.fields.Rules = {
      kind: 'text',
      text: { paragraphs: [{ runs: [{ text: 'Hit', style: { bold: true } }] }] },
    }
    const out = proofFields(c, { [f.id]: f, [b.id]: b })
    expect(out.map((x) => [x.field, x.side, x.text, x.own, x.editable])).toEqual([
      ['Title', 'front', 'Goblin', true, true],
      ['Rules', 'front', 'Hit', true, false],
      ['Flavour', 'back', 'Lore', false, true],
    ])
  })
})
