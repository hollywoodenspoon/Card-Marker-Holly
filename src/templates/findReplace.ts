/**
 * Find and replace across the project's text: each card's own field values,
 * card-only text, and (optionally) template default text. Pure.
 * Matches are found within a run of same-formatted text, so a word whose
 * letters have different formatting is not matched.
 */
import { flatten } from '@/core/model/tree'
import type { Card, Element, Id, RichText, Template } from '@/core/model/types'
import { plainText } from '@/core/text/richtext'

export interface FindOptions {
  matchCase?: boolean
  wholeWord?: boolean
  /** Also search the default text on templates. */
  templates?: boolean
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function findPattern(query: string, o: FindOptions): RegExp | null {
  if (!query) return null
  const body = escape(query)
  const src = o.wholeWord ? `(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])` : body
  return new RegExp(src, o.matchCase ? 'gu' : 'giu')
}

/** Replace in every run; returns the new text (same object when nothing matched) and the count. */
export function replaceInRichText(rt: RichText, re: RegExp, replacement: string) {
  let count = 0
  const paragraphs = rt.paragraphs.map((p) => {
    let changed = false
    const runs = p.runs.map((r) => {
      const text = r.text.replace(re, () => {
        count++
        changed = true
        return replacement
      })
      return text === r.text ? r : { ...r, text }
    })
    return changed ? { ...p, runs } : p
  })
  return { text: count ? { paragraphs } : rt, count }
}

export function countInRichText(rt: RichText, re: RegExp) {
  let n = 0
  for (const p of rt.paragraphs) for (const r of p.runs) n += [...r.text.matchAll(re)].length
  return n
}

export type MatchPlace =
  | { kind: 'cardField'; cardId: Id; field: string }
  | { kind: 'cardElement'; cardId: Id; side: 'front' | 'back'; elementId: Id }
  | { kind: 'template'; templateId: Id; elementId: Id }

export interface Match {
  place: MatchPlace
  /** Where it is, for the list: "Goblin · Rules" or "Template Creature · Title". */
  label: string
  count: number
  /** The text, for a preview. */
  text: string
}

const textElements = (els: Element[]) =>
  flatten(els).filter((e): e is Extract<Element, { type: 'text' }> => e.type === 'text')

/** Every place the query occurs, in Cards-list order, then templates. */
export function findMatches(
  query: string,
  o: FindOptions,
  doc: { cards: Record<Id, Card>; templates: Record<Id, Template> },
): Match[] {
  const re = findPattern(query, o)
  if (!re) return []
  const out: Match[] = []
  const cards = Object.values(doc.cards).sort((a, b) => a.order - b.order)
  for (const c of cards) {
    for (const [field, v] of Object.entries(c.fields)) {
      if (v.kind !== 'text') continue
      const count = countInRichText(v.text, re)
      if (count)
        out.push({
          place: { kind: 'cardField', cardId: c.id, field },
          label: `${c.name} · ${field}`,
          count,
          text: plainText(v.text),
        })
    }
    for (const side of ['front', 'back'] as const)
      for (const e of textElements(c.local[side])) {
        const count = countInRichText(e.defaultText, re)
        if (count)
          out.push({
            place: { kind: 'cardElement', cardId: c.id, side, elementId: e.id },
            label: `${c.name} · ${e.name}`,
            count,
            text: plainText(e.defaultText),
          })
      }
  }
  if (o.templates)
    for (const t of Object.values(doc.templates).sort((a, b) => a.createdAt - b.createdAt))
      for (const e of textElements(t.elements)) {
        const count = countInRichText(e.defaultText, re)
        if (count)
          out.push({
            place: { kind: 'template', templateId: t.id, elementId: e.id },
            label: `Template ${t.name} · ${e.name}`,
            count,
            text: plainText(e.defaultText),
          })
      }
  return out
}

/** Apply a replacement to a draft document at the given places. Returns the total count. */
export function replaceAt(
  d: { cards: Record<Id, Card>; templates: Record<Id, Template> },
  places: MatchPlace[],
  query: string,
  replacement: string,
  o: FindOptions,
): number {
  const re = findPattern(query, o)
  if (!re) return 0
  let total = 0
  const now = Date.now()
  const inElement = (els: Element[], id: Id) => {
    const e = textElements(els).find((x) => x.id === id)
    if (!e) return false
    const r = replaceInRichText(e.defaultText, re, replacement)
    e.defaultText = r.text
    total += r.count
    return r.count > 0
  }
  for (const p of places) {
    if (p.kind === 'cardField') {
      const c = d.cards[p.cardId]
      const v = c?.fields[p.field]
      if (!c || v?.kind !== 'text') continue
      const r = replaceInRichText(v.text, re, replacement)
      if (r.count) {
        c.fields[p.field] = { ...v, text: r.text }
        c.updatedAt = now
        total += r.count
      }
    } else if (p.kind === 'cardElement') {
      const c = d.cards[p.cardId]
      if (c && inElement(c.local[p.side], p.elementId)) c.updatedAt = now
    } else {
      const t = d.templates[p.templateId]
      if (t && inElement(t.elements, p.elementId)) t.updatedAt = now
    }
  }
  return total
}
