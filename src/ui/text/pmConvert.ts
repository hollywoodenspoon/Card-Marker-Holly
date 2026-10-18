import type { JSONContent } from '@tiptap/core'
import type { Paragraph, RichText, TextAlign, TextRun, TextStyle } from '@/core/model/types'
import { normalizeRichText, resolveStyle } from '@/core/text/richtext'

/**
 * RichText ⇄ ProseMirror JSON. In the editor every run carries its full
 * resolved style as marks (so "not bold" on a bold base is expressible);
 * converting back stores only differences from the element's base style.
 */

export function toPM(
  rt: RichText,
  base: TextStyle,
  align: TextAlign,
  lineHeight: number,
): JSONContent {
  return {
    type: 'doc',
    content: rt.paragraphs.map((p) => ({
      type: 'paragraph',
      attrs: { textAlign: p.align ?? align, lineHeight: String(p.lineHeight ?? lineHeight) },
      content: p.runs.filter((r) => r.text).map((r) => runToPM(r, base)),
    })),
  }
}

function runToPM(r: TextRun, base: TextStyle): JSONContent {
  const s = resolveStyle(base, r.style)
  const marks: JSONContent['marks'] = []
  if (s.bold) marks.push({ type: 'bold' })
  if (s.italic) marks.push({ type: 'italic' })
  if (s.underline) marks.push({ type: 'underline' })
  marks.push({
    type: 'textStyle',
    attrs: {
      fontFamily: s.fontFamily,
      fontSize: `${s.sizePt}pt`,
      color: s.color,
      letterSpacing: s.letterSpacingEm ? `${s.letterSpacingEm}em` : null,
    },
  })
  return { type: 'text', text: r.text, marks }
}

export function fromPM(
  doc: JSONContent,
  base: TextStyle,
  align: TextAlign,
  lineHeight: number,
): RichText {
  const paragraphs: Paragraph[] = (doc.content ?? []).map((p) => {
    const para: Paragraph = { runs: [] }
    const a = p.attrs?.textAlign as TextAlign | undefined
    if (a && a !== align) para.align = a
    const lh = parseFloat(String(p.attrs?.lineHeight ?? ''))
    if (Number.isFinite(lh) && Math.abs(lh - lineHeight) > 1e-6) para.lineHeight = lh
    for (const n of p.content ?? []) {
      if (n.type !== 'text' || !n.text) continue
      para.runs.push({ text: n.text, ...diffStyle(styleFromMarks(n.marks ?? [], base), base) })
    }
    return para
  })
  return normalizeRichText({ paragraphs })
}

function styleFromMarks(marks: NonNullable<JSONContent['marks']>, base: TextStyle): TextStyle {
  const s: TextStyle = { ...base, bold: false, italic: false, underline: false }
  for (const m of marks) {
    if (m.type === 'bold') s.bold = true
    if (m.type === 'italic') s.italic = true
    if (m.type === 'underline') s.underline = true
    if (m.type === 'textStyle') {
      const a = m.attrs ?? {}
      if (a.fontFamily) s.fontFamily = String(a.fontFamily).replace(/^["']|["']$/g, '')
      if (a.fontSize) {
        const v = parseFloat(String(a.fontSize))
        if (Number.isFinite(v)) s.sizePt = String(a.fontSize).endsWith('px') ? (v * 72) / 96 : v
      }
      if (a.color) s.color = normaliseColor(String(a.color))
      if (a.letterSpacing) {
        const v = parseFloat(String(a.letterSpacing))
        if (Number.isFinite(v)) s.letterSpacingEm = v
      }
    }
  }
  return s
}

function diffStyle(s: TextStyle, base: TextStyle): { style?: Partial<TextStyle> } {
  const d: Partial<TextStyle> = {}
  for (const k of Object.keys(s) as (keyof TextStyle)[]) {
    if (s[k] !== base[k]) (d as Record<string, unknown>)[k] = s[k]
  }
  return Object.keys(d).length ? { style: d } : {}
}

/** Browsers report colours as rgb(); store hex. */
export function normaliseColor(c: string): string {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c)
  if (!m) return c.toLowerCase()
  return (
    '#' +
    m
      .slice(1, 4)
      .map((x) => Number(x).toString(16).padStart(2, '0'))
      .join('')
  )
}
