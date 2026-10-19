import type { Card, Id, PrintSettings } from '@/core/model/types'

export interface PrintEntry {
  card: Card
  copies: number
}

export const copiesOf = (settings: Pick<PrintSettings, 'copies'>, cardId: Id) =>
  settings.copies?.[cardId] ?? 1

/**
 * Every card in print order with its copy count. A custom order lists card
 * ids; cards it doesn't name (added later) follow in Cards-list order, and ids
 * of deleted cards are ignored.
 */
export function printEntries(
  cards: Card[],
  settings: Pick<PrintSettings, 'copies' | 'order'>,
): PrintEntry[] {
  const byList = [...cards].sort((a, b) => a.order - b.order)
  let ordered = byList
  if (settings.order) {
    const byId = new Map(byList.map((c) => [c.id, c]))
    const seen = new Set<Id>()
    ordered = []
    for (const id of settings.order) {
      const c = byId.get(id)
      if (c && !seen.has(id)) {
        ordered.push(c)
        seen.add(id)
      }
    }
    for (const c of byList) if (!seen.has(c.id)) ordered.push(c)
  }
  return ordered.map((card) => ({ card, copies: copiesOf(settings, card.id) }))
}

/** Cell-by-cell card indices into `entries`: copies sit next to each other. */
export function printSlots(entries: PrintEntry[]): number[] {
  const slots: number[] = []
  entries.forEach((e, i) => {
    for (let k = 0; k < e.copies; k++) slots.push(i)
  })
  return slots
}

/** Move one card in the print order (indices into `printEntries`). */
export function movedOrder(entries: PrintEntry[], from: number, to: number): Id[] {
  const ids = entries.map((e) => e.card.id)
  const [id] = ids.splice(from, 1)
  ids.splice(to, 0, id)
  return ids
}
