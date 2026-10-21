import { flatten } from '@/core/model/tree'
import type { Card, Element, FieldElement, Template } from '@/core/model/types'

export function isField(el: Element): el is FieldElement {
  return el.type === 'text' || el.type === 'imageField' || el.type === 'iconRow'
}

export function templateFields(t: Template): FieldElement[] {
  return flatten(t.elements).filter(isField)
}

/** Other fields in the template using the same name (they will show the same value). */
export function sharedFieldNames(t: Template, el: FieldElement): FieldElement[] {
  return templateFields(t).filter((f) => f.id !== el.id && f.fieldName === el.fieldName)
}

/**
 * When a field is renamed in a template, move card values to the new name
 * for cards using that template — unless the card already has a value there.
 * `keepOld`: another part still uses the old name, so its value stays as well.
 */
export function migrateFieldRename(
  cards: Card[],
  templateId: string,
  from: string,
  to: string,
  keepOld = false,
) {
  if (from === to) return
  for (const c of cards) {
    if (c.frontTemplateId !== templateId && c.backTemplateId !== templateId) continue
    if (c.fields[from] && !c.fields[to]) {
      c.fields[to] = c.fields[from]
      if (!keepOld) delete c.fields[from]
    }
  }
}

export function cardsUsingTemplate(cards: Card[], templateId: string): Card[] {
  return cards.filter((c) => c.frontTemplateId === templateId || c.backTemplateId === templateId)
}
