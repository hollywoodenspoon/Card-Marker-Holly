/** Card text for the proofreading view. Pure. */
import { flatten } from '@/core/model/tree'
import type { Card, Id, RichText, Template } from '@/core/model/types'
import { plainText } from '@/core/text/richtext'

export interface ProofField {
  field: string
  side: 'front' | 'back'
  /** What the card shows: its own value, else the template default. */
  text: string
  own: boolean
  /** Plain text can be edited here; formatted text is edited on the card. */
  editable: boolean
}

/** No per-word formatting and no per-paragraph alignment or spacing. */
export const isPlain = (rt: RichText) =>
  rt.paragraphs.every(
    (p) =>
      p.align === undefined &&
      p.lineHeight === undefined &&
      p.runs.every((r) => !r.style || Object.keys(r.style).length === 0),
  )

/** The text fields a card shows (front first), once per field name. */
export function proofFields(card: Card, templates: Record<Id, Template>): ProofField[] {
  const out: ProofField[] = []
  const seen = new Set<string>()
  for (const side of ['front', 'back'] as const) {
    const tid = side === 'front' ? card.frontTemplateId : card.backTemplateId
    const t = tid ? templates[tid] : undefined
    if (!t) continue
    for (const e of flatten(t.elements)) {
      if (e.type !== 'text' || seen.has(e.fieldName)) continue
      seen.add(e.fieldName)
      const v = card.fields[e.fieldName]
      const own = v?.kind === 'text'
      const rt = own ? v.text : e.defaultText
      out.push({ field: e.fieldName, side, text: plainText(rt), own, editable: isPlain(rt) })
    }
  }
  return out
}
