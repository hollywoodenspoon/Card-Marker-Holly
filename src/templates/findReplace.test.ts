import { describe, expect, it } from 'vitest'
import { createCard, createTemplate, createText } from '@/core/model/factories'
import type { RichText } from '@/core/model/types'
import { plainText, richTextFromPlain } from '@/core/text/richtext'
import { findMatches, findPattern, replaceAt, replaceInRichText } from './findReplace'

const size = { presetId: 'id', widthMm: 54, heightMm: 86 }
const box = { xMm: 0, yMm: 0, wMm: 10, hMm: 10 }

function doc() {
  const t = createTemplate('p', 'front', size, 'Creature', [
    createText(box, { name: 'Rules', defaultText: richTextFromPlain('Deal 1 damage.') }),
  ])
  const a = createCard('p', 1, t.id, null, 'Goblin')
  a.fields.Rules = { kind: 'text', text: richTextFromPlain('Deal 2 damage. Damaged units flee.') }
  const b = createCard('p', 2, t.id, null, 'Bat')
  b.local.front.push(createText(box, { name: 'Note', defaultText: richTextFromPlain('damage') }))
  return {
    t,
    a,
    b,
    d: {
      cards: { [a.id]: a, [b.id]: b },
      templates: { [t.id]: t },
    },
  }
}

describe('find and replace', () => {
  it('finds in card values and card-only text, optionally templates', () => {
    const { d } = doc()
    const m = findMatches('damage', {}, d)
    expect(m.map((x) => [x.label, x.count])).toEqual([
      ['Goblin · Rules', 2],
      ['Bat · Note', 1],
    ])
    expect(findMatches('damage', { templates: true }, d).at(-1)!.label).toBe(
      'Template Creature · Rules',
    )
  })

  it('respects match case and whole words', () => {
    const { d } = doc()
    expect(findMatches('damage', { wholeWord: true }, d)[0].count).toBe(1)
    expect(findMatches('Damage', { matchCase: true }, d)[0].count).toBe(1)
  })

  it('replaces at the chosen places, keeping formatting of each run', () => {
    const { d, a, t } = doc()
    const places = findMatches('damage', { wholeWord: true, templates: true }, d).map(
      (m) => m.place,
    )
    expect(replaceAt(d, places, 'damage', 'harm', { wholeWord: true })).toBe(3)
    expect(
      plainText(a.fields.Rules.kind === 'text' ? a.fields.Rules.text : richTextFromPlain('')),
    ).toBe('Deal 2 harm. Damaged units flee.')
    expect(
      plainText(t.elements[0].type === 'text' ? t.elements[0].defaultText : richTextFromPlain('')),
    ).toBe('Deal 1 harm.')
  })

  it('leaves run styles alone and returns the same object when nothing matches', () => {
    const rt: RichText = { paragraphs: [{ runs: [{ text: 'big hit', style: { bold: true } }] }] }
    const r = replaceInRichText(rt, findPattern('hit', {})!, 'blow')
    expect(r.text.paragraphs[0].runs[0]).toEqual({ text: 'big blow', style: { bold: true } })
    expect(replaceInRichText(rt, findPattern('zzz', {})!, 'x').text).toBe(rt)
  })

  it('treats special characters literally', () => {
    const rt = richTextFromPlain('Cost: (2) + {fire}')
    expect(replaceInRichText(rt, findPattern('(2)', {})!, '(3)').count).toBe(1)
    expect(plainText(replaceInRichText(rt, findPattern('{fire}', {})!, '{ice}').text)).toBe(
      'Cost: (2) + {ice}',
    )
  })
})
