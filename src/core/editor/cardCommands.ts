import { createCard } from '../model/factories'
import { newId } from '../model/ids'
import { cloneWithNewIds, uniqueName } from '../model/tree'
import type { Card } from '../model/types'
import { commit, setView, useEditor } from './editorStore'
import { currentCard, sortedCards } from './selectors'

/** Order key placed after `after` (or at the end). */
function orderAfter(cards: Card[], after?: Card): number {
  if (!after) return (cards[cards.length - 1]?.order ?? 0) + 1
  const i = cards.findIndex((c) => c.id === after.id)
  const next = cards[i + 1]
  return next ? (after.order + next.order) / 2 : after.order + 1
}

/** New card. By default uses the previous (current) card's front and back templates. */
export function addCard(opts: { blank?: boolean } = {}) {
  const s = useEditor.getState()
  if (!s.doc) return
  const cards = sortedCards(s)
  const prev = currentCard(s) ?? cards[cards.length - 1]
  const templates = Object.values(s.doc.templates).sort((a, b) => a.createdAt - b.createdAt)
  const front = prev?.frontTemplateId ?? templates.find((t) => t.side === 'front')?.id ?? null
  const back = prev?.backTemplateId ?? templates.find((t) => t.side === 'back')?.id ?? null
  const name = uniqueName(
    `Card ${cards.length + 1}`,
    cards.map((c) => c.name),
  )
  const card = createCard(s.doc.project.id, orderAfter(cards, prev), front, back, name)
  if (!opts.blank && prev) {
    // "Use previous card's layout": same templates and part toggles, empty fields.
    card.overrides = structuredClone(prev.overrides)
  }
  commit((d) => {
    d.cards[card.id] = card
  })
  setView({ cardId: card.id, selection: [], mode: 'card' })
  return card.id
}

export function duplicateCard(id: string) {
  const s = useEditor.getState()
  const src = s.doc?.cards[id]
  if (!s.doc || !src) return
  const cards = sortedCards(s)
  const copy: Card = {
    ...structuredClone(src),
    id: newId(),
    name: uniqueName(
      `${src.name} copy`,
      cards.map((c) => c.name),
    ),
    order: orderAfter(cards, src),
    local: {
      front: src.local.front.map(cloneWithNewIds),
      back: src.local.back.map(cloneWithNewIds),
    },
    thumbnail: src.thumbnail,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  commit((d) => {
    d.cards[copy.id] = copy
  })
  setView({ cardId: copy.id, selection: [] })
}

export function deleteCard(id: string) {
  const s = useEditor.getState()
  if (!s.doc?.cards[id]) return
  const cards = sortedCards(s)
  const i = cards.findIndex((c) => c.id === id)
  const neighbour = cards[i + 1] ?? cards[i - 1]
  commit((d) => {
    delete d.cards[id]
  })
  if (s.view.cardId === id) setView({ cardId: neighbour?.id ?? null, selection: [] })
}

export function renameCard(id: string, name: string) {
  commit((d) => {
    const c = d.cards[id]
    if (c) c.name = name
  })
}

/** Move a card to a new index in the sorted list. */
export function moveCard(id: string, toIndex: number) {
  const s = useEditor.getState()
  const cards = sortedCards(s).filter((c) => c.id !== id)
  const before = cards[toIndex - 1]
  const after = cards[toIndex]
  const order =
    before && after
      ? (before.order + after.order) / 2
      : before
        ? before.order + 1
        : after
          ? after.order - 1
          : 1
  commit((d) => {
    const c = d.cards[id]
    if (c) c.order = order
  })
}

export function selectCard(id: string) {
  setView({ cardId: id, selection: [], editingTextId: null, cropId: null, mode: 'card' })
}

/** Mark a card's content as changed (used to stamp updatedAt). */
export function touchCard(d: { cards: Record<string, Card> }, id: string) {
  const c = d.cards[id]
  if (c) c.updatedAt = Date.now()
}
