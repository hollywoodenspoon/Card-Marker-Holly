import { describe, expect, it } from 'vitest'
import { createCard, createShape, createTemplate, createText } from '@/core/model/factories'
import type { Keyword, RichText } from '@/core/model/types'
import { plainText, richTextFromPlain } from '@/core/text/richtext'
import { resolveSide } from './resolve'
import { fieldDefaults, ruleHolds } from './rules'
import { applyKeywords, replaceNumberTokens } from './textDecor'

const size = { presetId: 'id', widthMm: 54, heightMm: 86 }
const box = { xMm: 0, yMm: 0, wMm: 10, hMm: 10 }

describe('show-when rules', () => {
  const rarity = createText(box, { name: 'Rarity', defaultText: richTextFromPlain('Common') })
  const gem = createShape(box, {
    name: 'Gem',
    showIf: { field: 'Rarity', op: 'is', value: 'rare' },
  })
  const t = createTemplate('p', 'front', size, 'Front', [rarity, gem])
  const card = (v?: string) => {
    const c = createCard('p', 1, t.id, null)
    if (v !== undefined) c.fields.Rarity = { kind: 'text', text: richTextFromPlain(v) }
    return c
  }
  const shown = (c: ReturnType<typeof card>) =>
    resolveSide(t, c, 'front', 'card').map((n) => n.element.name)

  it('shows a part only when its rule holds, ignoring case', () => {
    expect(shown(card('Rare'))).toEqual(['Rarity', 'Gem'])
    expect(shown(card('Uncommon'))).toEqual(['Rarity'])
    // no value on the card: the template default ("Common") is compared
    expect(shown(card())).toEqual(['Rarity'])
  })

  it('lets a per-card toggle override the rule', () => {
    const c = card('Common')
    c.overrides[gem.id] = { visible: true }
    expect(shown(c)).toContain('Gem')
  })

  it('shows every part in template mode', () => {
    expect(resolveSide(t, card('Common'), 'front', 'template').map((n) => n.element.name)).toEqual([
      'Rarity',
      'Gem',
    ])
  })

  it('evaluates each condition', () => {
    const d = fieldDefaults(t.elements)
    const c = card('Very Rare')
    const r = (op: 'is' | 'isNot' | 'contains' | 'empty' | 'notEmpty', value?: string) =>
      ruleHolds({ field: 'Rarity', op, value }, c, d)
    expect([r('is', 'very rare'), r('isNot', 'rare'), r('contains', 'RARE')]).toEqual([
      true,
      true,
      true,
    ])
    expect([r('empty'), r('notEmpty')]).toEqual([false, true])
    expect(ruleHolds({ field: 'Missing', op: 'empty' }, c, d)).toBe(true)
  })
})

describe('card number tokens', () => {
  it('fills in the number, padding and total', () => {
    const ctx = { number: 7, total: 60 }
    expect(replaceNumberTokens('{#}/{total}', ctx)).toBe('7/60')
    expect(replaceNumberTokens('No. {#:3}', ctx)).toBe('No. 007')
    expect(replaceNumberTokens('plain {fire} text', ctx)).toBe('plain {fire} text')
    expect(replaceNumberTokens('{#}', {})).toBe('{#}')
  })

  it('numbers a resolved card', () => {
    const num = createText(box, { name: 'No', defaultText: richTextFromPlain('{#:2} of {total}') })
    const t = createTemplate('p', 'front', size, 'F', [num])
    const [n] = resolveSide(t, createCard('p', 1, t.id, null), 'front', 'card', undefined, {
      number: 3,
      total: 12,
    })
    expect(plainText(n.text!.text)).toBe('03 of 12')
  })
})

describe('keyword styling', () => {
  const kws: Keyword[] = [
    { id: '1', word: 'Flying', style: { bold: true, color: '#cc0000' } },
    { id: '2', word: 'deal damage', style: { italic: true } },
  ]
  const runs = (rt: RichText) => rt.paragraphs[0].runs

  it('styles whole words and phrases in any case', () => {
    const out = runs(applyKeywords(richTextFromPlain('flying. Deal  damage, not Flyingly.'), kws))
    expect(out.map((r) => r.text)).toEqual(['flying', '. ', 'Deal  damage', ', not Flyingly.'])
    expect(out[0].style).toEqual({ bold: true, color: '#cc0000' })
    expect(out[2].style).toEqual({ italic: true })
    expect(out[1].style).toBeUndefined()
  })

  it('keeps explicit formatting on top and leaves {symbols} alone', () => {
    const rt: RichText = {
      paragraphs: [{ runs: [{ text: 'Flying {flying}', style: { color: '#0000ff' } }] }],
    }
    const out = runs(applyKeywords(rt, kws))
    expect(out[0]).toEqual({ text: 'Flying', style: { bold: true, color: '#0000ff' } })
    expect(out.find((r) => r.text === '{flying}')!.style).toEqual({ color: '#0000ff' })
  })

  it('can be turned off per text part', () => {
    const el = createText(box, {
      name: 'Title',
      defaultText: richTextFromPlain('Flying'),
      styleKeywords: false,
    })
    const t = createTemplate('p', 'front', size, 'F', [el])
    const [n] = resolveSide(t, createCard('p', 1, t.id, null), 'front', 'card', undefined, {
      keywords: kws,
    })
    expect(runs(n.text!.text)[0].style).toBeUndefined()
  })
})

describe('keywords in template files', () => {
  it('exports keywords and imports only the ones the project lacks', async () => {
    const { exportTemplate, importTemplate } = await import('./templateFile')
    const t = createTemplate('p', 'front', size, 'F', [])
    const kws: Keyword[] = [
      { id: 'a', word: 'Flying', style: { bold: true } },
      { id: 'b', word: 'Haste', style: { italic: true } },
    ]
    const file = JSON.parse(JSON.stringify(await exportTemplate(t, {}, {}, {}, kws)))
    const r = importTemplate(file, 'p2', [], {
      keywords: [{ id: 'x', word: 'flying', style: {} }],
    })
    expect(r.keywords.map((k) => k.word)).toEqual(['Haste'])
    expect(r.keywords[0].id).not.toBe('b')
  })
})
