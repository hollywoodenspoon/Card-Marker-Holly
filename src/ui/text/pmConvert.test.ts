import { describe, expect, it } from 'vitest'
import type { RichText } from '@/core/model/types'
import { DEFAULT_TEXT_STYLE } from '@/core/text/richtext'
import { fromPM, normaliseColor, toPM } from './pmConvert'

const base = { ...DEFAULT_TEXT_STYLE, sizePt: 10 }

describe('RichText ⇄ ProseMirror', () => {
  it('round-trips styled runs, storing only differences', () => {
    const rt: RichText = {
      paragraphs: [
        {
          runs: [
            { text: 'Deal ' },
            { text: '3', style: { bold: true, color: '#cc0000' } },
            { text: ' damage' },
          ],
        },
        {
          align: 'center',
          lineHeight: 1.5,
          runs: [{ text: 'Flavor', style: { italic: true, sizePt: 8 } }],
        },
      ],
    }
    const back = fromPM(toPM(rt, base, 'left', 1.2), base, 'left', 1.2)
    expect(back).toEqual(rt)
  })

  it('can express "not bold" on a bold base style', () => {
    const boldBase = { ...base, bold: true }
    const doc = toPM({ paragraphs: [{ runs: [{ text: 'a' }] }] }, boldBase, 'left', 1.2)
    // remove the bold mark, as un-bolding in the editor would
    doc.content![0].content![0].marks = doc.content![0].content![0].marks!.filter(
      (m) => m.type !== 'bold',
    )
    expect(fromPM(doc, boldBase, 'left', 1.2).paragraphs[0].runs[0].style).toEqual({ bold: false })
  })

  it('lets text typed without marks inherit the base style', () => {
    const boldBase = { ...base, bold: true }
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New' }] }],
    }
    expect(fromPM(doc, boldBase, 'left', 1.2).paragraphs[0].runs[0]).toEqual({ text: 'New' })
  })

  it('keeps empty paragraphs', () => {
    const rt = fromPM(
      { type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] },
      base,
      'left',
      1.2,
    )
    expect(rt.paragraphs).toHaveLength(2)
  })

  it('normalises rgb colours', () => {
    expect(normaliseColor('rgb(255, 0, 16)')).toBe('#ff0010')
  })
})
