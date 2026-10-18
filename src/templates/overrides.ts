import type { Card, Element } from '@/core/model/types'

/**
 * Set a template part's visibility on one card. Only differences from the
 * template are stored: matching the default removes the override.
 */
export function setPartVisibility(card: Card, el: Element, visible: boolean) {
  if (el.toggleLocked) return
  const cur = card.overrides[el.id] ?? {}
  if (visible === el.defaultVisible) {
    delete cur.visible
  } else {
    cur.visible = visible
  }
  if (Object.keys(cur).length) card.overrides[el.id] = cur
  else delete card.overrides[el.id]
}
