import type { Card, Side } from '@/core/model/types'

/**
 * Point a card's side at another template. Field values are keyed by field
 * name, so matching names carry over automatically and everything else stays
 * stored on the card (switching back restores it). Overrides are keyed by
 * element id and likewise stay put.
 */
export function switchTemplate(card: Card, side: Side, templateId: string | null) {
  if (side === 'front') card.frontTemplateId = templateId
  else card.backTemplateId = templateId
  card.updatedAt = Date.now()
}
