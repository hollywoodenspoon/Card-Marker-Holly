import { walk } from '@/core/model/tree'
import type { Card, Element, FieldValue, ShowRule } from '@/core/model/types'
import { plainText } from '@/core/text/richtext'

/** Template defaults per field name, as text (used when a card has no value of its own). */
export type FieldDefaults = Map<string, string>

const valueText = (v: FieldValue | undefined): string | undefined => {
  if (!v) return undefined
  if (v.kind === 'text') return plainText(v.text)
  if (v.kind === 'count') return String(v.count)
  return v.assetId ?? ''
}

/** Default value of every field in these elements, as text. */
export function fieldDefaults(els: Element[]): FieldDefaults {
  const out: FieldDefaults = new Map()
  walk(els, (e) => {
    if (!('fieldName' in e) || out.has(e.fieldName)) return
    if (e.type === 'text') out.set(e.fieldName, plainText(e.defaultText))
    else if (e.type === 'iconRow') out.set(e.fieldName, String(e.defaultCount))
    else out.set(e.fieldName, e.defaultAssetId ?? '')
  })
  return out
}

const cache = new WeakMap<Element[], FieldDefaults>()
/** `fieldDefaults`, cached per element list (for UI selectors that run often). */
export function cachedDefaults(t: { elements: Element[] } | undefined): FieldDefaults | undefined {
  if (!t) return undefined
  let d = cache.get(t.elements)
  if (!d) cache.set(t.elements, (d = fieldDefaults(t.elements)))
  return d
}

/** The text a rule compares: the card's own value, else the template default. */
export function fieldText(card: Card | undefined, field: string, defaults?: FieldDefaults) {
  return valueText(card?.fields[field]) ?? defaults?.get(field) ?? ''
}

/** Does the rule hold for this card? A part without a rule always passes. */
export function ruleHolds(
  rule: ShowRule | undefined,
  card: Card | undefined,
  defaults?: FieldDefaults,
): boolean {
  if (!rule || !rule.field) return true
  const v = fieldText(card, rule.field, defaults).trim().toLowerCase()
  const want = (rule.value ?? '').trim().toLowerCase()
  switch (rule.op) {
    case 'is':
      return v === want
    case 'isNot':
      return v !== want
    case 'contains':
      return want === '' || v.includes(want)
    case 'empty':
      return v === ''
    case 'notEmpty':
      return v !== ''
  }
}

export const RULE_OPS: { id: ShowRule['op']; label: string; needsValue: boolean }[] = [
  { id: 'is', label: 'is', needsValue: true },
  { id: 'isNot', label: 'is not', needsValue: true },
  { id: 'contains', label: 'contains', needsValue: true },
  { id: 'notEmpty', label: 'is filled in', needsValue: false },
  { id: 'empty', label: 'is empty', needsValue: false },
]

/** Short description, e.g. “Rarity is Rare”. */
export function describeRule(rule: ShowRule) {
  const op = RULE_OPS.find((o) => o.id === rule.op)
  return `${rule.field} ${op?.label ?? rule.op}${op?.needsValue ? ` “${rule.value ?? ''}”` : ''}`
}
