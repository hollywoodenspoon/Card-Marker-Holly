import type { Paragraph, RichText, TextRun, TextStyle } from '../model/types'

export const DEFAULT_FONT = 'Inter'

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: DEFAULT_FONT,
  sizePt: 10,
  color: '#1a1a1a',
  bold: false,
  italic: false,
  underline: false,
  letterSpacingEm: 0,
}

export function richTextFromPlain(s: string): RichText {
  return { paragraphs: s.split('\n').map((line) => ({ runs: line ? [{ text: line }] : [] })) }
}

export function plainText(rt: RichText): string {
  return rt.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join('\n')
}

export function isEmptyRichText(rt: RichText | undefined): boolean {
  return !rt || rt.paragraphs.every((p) => p.runs.every((r) => r.text === ''))
}

export function resolveStyle(base: TextStyle, over?: Partial<TextStyle>): TextStyle {
  return over ? { ...base, ...stripUndefined(over) } : base
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {}
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] !== undefined) out[k] = o[k]
  return out
}

const sameStyle = (a?: Partial<TextStyle>, b?: Partial<TextStyle>) =>
  JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})

/** Merge adjacent runs with identical styles and drop empty runs. */
export function normalizeParagraph(p: Paragraph): Paragraph {
  const runs: TextRun[] = []
  for (const r of p.runs) {
    if (!r.text) continue
    const last = runs[runs.length - 1]
    if (last && sameStyle(last.style, r.style)) last.text += r.text
    else
      runs.push({
        text: r.text,
        ...(r.style && Object.keys(r.style).length ? { style: { ...r.style } } : {}),
      })
  }
  return { ...p, runs }
}

export function normalizeRichText(rt: RichText): RichText {
  const paragraphs = rt.paragraphs.map(normalizeParagraph)
  return { paragraphs: paragraphs.length ? paragraphs : [{ runs: [] }] }
}

/** Apply a style patch to every run (used by the properties panel when nothing finer is selected). */
export function applyStyleToAll(rt: RichText, patch: Partial<TextStyle>): RichText {
  return {
    paragraphs: rt.paragraphs.map((p) => ({
      ...p,
      runs: p.runs.map((r) => ({ ...r, style: { ...r.style, ...patch } })),
    })),
  }
}

/** Remove keys from every run style (so the base style takes over again). */
export function clearRunStyleKeys(rt: RichText, keys: (keyof TextStyle)[]): RichText {
  return {
    paragraphs: rt.paragraphs.map((p) => ({
      ...p,
      runs: p.runs.map((r) => {
        if (!r.style) return r
        const style = { ...r.style }
        for (const k of keys) delete style[k]
        return Object.keys(style).length ? { ...r, style } : { text: r.text }
      }),
    })),
  }
}
