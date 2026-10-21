import type { Card, Id, Side, Template } from '@/core/model/types'
import { anchorOf, sameSize } from './sizeGroups'

/**
 * Point a card's side at another template. Field values are keyed by field
 * name, so matching names carry over automatically and everything else stays
 * stored on the card (switching back restores it). Overrides are keyed by
 * element id and likewise stay put.
 *
 * With `templates`, the card's back follows a new front: it switches to the
 * back that front is anchored to, so front and back always match in size.
 * A different back of the same size can be picked afterwards.
 */
export function switchTemplate(
  card: Card,
  side: Side,
  templateId: string | null,
  templates?: Record<Id, Template>,
) {
  if (side === 'front') {
    card.frontTemplateId = templateId
    const anchor = templates && anchorOf(templates, templateId)
    if (anchor) card.backTemplateId = anchor.id
  } else card.backTemplateId = templateId
  card.updatedAt = Date.now()
}

/** Whether a back can go with this card's front (same size, or no front). */
export function backFits(templates: Record<Id, Template>, card: Card, backId: Id): boolean {
  const front = card.frontTemplateId ? templates[card.frontTemplateId] : undefined
  const back = templates[backId]
  return !front || !back || sameSize(front.size, back.size)
}
