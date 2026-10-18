import { newId } from '@/core/model/ids'
import { cloneWithNewIds } from '@/core/model/tree'
import type { Card, Element, Side, Template } from '@/core/model/types'
import { isVisibleOnCard } from './resolve'

/**
 * A new template from what a card shows on one side: its template's parts
 * (with this card's visibility as the new defaults and its values as the new
 * default content) plus the card's own elements. All ids are fresh.
 */
export function saveCardAsTemplate(
  card: Card,
  side: Side,
  template: Template | undefined,
  name: string,
  fallbackSize: Template['size'],
): Template {
  const fromTemplate = (els: Element[]): Element[] =>
    els.map((el) => {
      const copy = structuredClone(el) as Element
      copy.defaultVisible = isVisibleOnCard(el, card)
      if (copy.type === 'text') {
        const v = card.fields[copy.fieldName]
        if (v?.kind === 'text') copy.defaultText = structuredClone(v.text)
      }
      if (copy.type === 'imageField') {
        const v = card.fields[copy.fieldName]
        if (v?.kind === 'image') {
          copy.defaultAssetId = v.assetId
          if (v.fit) copy.fit = v.fit
        }
      }
      if (copy.type === 'group' && el.type === 'group') copy.children = fromTemplate(el.children)
      return copy
    })
  const elements = [
    ...fromTemplate(template?.elements ?? []).map(cloneWithNewIds),
    ...card.local[side].map((e) => cloneWithNewIds(structuredClone(e))),
  ]
  const now = Date.now()
  return {
    id: newId(),
    projectId: card.projectId,
    name,
    side,
    size: structuredClone(template?.size ?? fallbackSize),
    elements,
    guides: structuredClone(template?.guides ?? []).map((g) => ({ ...g, id: newId() })),
    createdAt: now,
    updatedAt: now,
  }
}
