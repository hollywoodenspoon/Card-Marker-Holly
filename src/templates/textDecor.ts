/**
 * Resolve-time text changes, shared by the canvas, thumbnails, print preview
 * and PDF: card-number tokens and keyword styling. The stored text is never
 * changed, so editing a card still shows what was typed.
 */
import type { Keyword, RichText, TextElement, TextRun, TextValue } from '@/core/model/types'
import type { ResolveContext } from './resolve'

const NUMBER_TOKEN = /\{#(?::(\d{1,2}))?\}|\{total\}/gi

/** Replace `{#}`, `{#:3}` (zero-padded) and `{total}`. Leaves them as typed when unknown. */
export function replaceNumberTokens(text: string, ctx: ResolveContext): string {
  if (!text.includes('{')) return text
  return text.replace(NUMBER_TOKEN, (m, pad: string | undefined) => {
    if (m.toLowerCase() === '{total}') return ctx.total === undefined ? m : String(ctx.total)
    if (ctx.number === undefined) return m
    return pad ? String(ctx.number).padStart(Number(pad), '0') : String(ctx.number)
  })
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** One regex for all keywords: whole words, any case, longest first. */
export function keywordPattern(keywords: Keyword[]): RegExp | null {
  const words = keywords
    .map((k) => k.word.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  if (!words.length) return null
  const alts = words.map((w) => escape(w).replace(/\s+/g, '\\s+'))
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alts.join('|')})(?![\\p{L}\\p{N}_])`, 'giu')
}

/** Split a run so keyword matches get their style (explicit run formatting still wins). */
function styleRun(run: TextRun, re: RegExp, keywords: Keyword[]): TextRun[] {
  const out: TextRun[] = []
  // Never style inside `{symbol}` names.
  const parts = run.text.split(/(\{[^{}\s]+\})/)
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('{') && part.endsWith('}')) {
      out.push({ ...run, text: part })
      continue
    }
    let last = 0
    re.lastIndex = 0
    for (const m of part.matchAll(re)) {
      const i = m.index ?? 0
      if (i > last) out.push({ ...run, text: part.slice(last, i) })
      const norm = m[0].replace(/\s+/g, ' ').toLowerCase()
      const kw = keywords.find((k) => k.word.trim().replace(/\s+/g, ' ').toLowerCase() === norm)
      out.push({ text: m[0], style: { ...kw?.style, ...run.style } })
      last = i + m[0].length
    }
    if (last < part.length) out.push({ ...run, text: part.slice(last) })
  }
  return out.map((r) => (r.style && !Object.keys(r.style).length ? { text: r.text } : r))
}

export function applyKeywords(text: RichText, keywords: Keyword[]): RichText {
  const re = keywordPattern(keywords)
  if (!re) return text
  return {
    paragraphs: text.paragraphs.map((p) => ({
      ...p,
      runs: p.runs.flatMap((r) => styleRun(r, re, keywords)),
    })),
  }
}

/** The text a part shows on a card: numbers filled in, keywords styled. */
export function decorateText(v: TextValue, el: TextElement, ctx: ResolveContext): TextValue {
  let text = v.text
  const hasTokens = text.paragraphs.some((p) => p.runs.some((r) => r.text.includes('{')))
  if (hasTokens)
    text = {
      paragraphs: text.paragraphs.map((p) => ({
        ...p,
        runs: p.runs.map((r) => ({ ...r, text: replaceNumberTokens(r.text, ctx) })),
      })),
    }
  if (ctx.keywords?.length && el.styleKeywords !== false) text = applyKeywords(text, ctx.keywords)
  return text === v.text ? v : { ...v, text }
}
