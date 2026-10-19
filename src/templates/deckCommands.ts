import { commit } from '@/core/editor/editorStore'
import { newId } from '@/core/model/ids'
import { uniqueName } from '@/core/model/tree'
import type { Deck, Id } from '@/core/model/types'

const clamp = (n: number) => Math.max(0, Math.min(99, Math.round(Number.isFinite(n) ? n : 0)))

/** A new, empty deck; returns its id. */
export function addDeck(name = 'New deck', counts: Record<Id, number> = {}): Id {
  const id = newId()
  commit((d) => {
    const decks = (d.project.decks ??= [])
    decks.push({
      id,
      name: uniqueName(
        name,
        decks.map((x) => x.name),
      ),
      counts,
    })
  })
  return id
}

export function duplicateDeck(id: Id): Id | undefined {
  let copy: Deck | undefined
  commit((d) => {
    const decks = d.project.decks ?? []
    const src = decks.find((x) => x.id === id)
    if (!src) return
    copy = {
      id: newId(),
      name: uniqueName(
        `${src.name} copy`,
        decks.map((x) => x.name),
      ),
      counts: { ...src.counts },
    }
    decks.push(copy)
  })
  return copy?.id
}

export function renameDeck(id: Id, name: string) {
  commit((d) => {
    const deck = d.project.decks?.find((x) => x.id === id)
    if (deck && name.trim()) deck.name = name.trim()
  })
}

export function deleteDeck(id: Id) {
  commit((d) => {
    d.project.decks = (d.project.decks ?? []).filter((x) => x.id !== id)
    if (d.project.print.deckId === id) d.project.print.deckId = null
  })
}

/** How many of these cards the deck holds (0 removes them). */
export function setDeckCount(deckId: Id, cardIds: Id[], n: number, coalesce?: string) {
  commit((d) => {
    const deck = d.project.decks?.find((x) => x.id === deckId)
    if (!deck) return
    const c = clamp(n)
    const counts = { ...deck.counts }
    for (const id of cardIds) {
      if (c) counts[id] = c
      else delete counts[id]
    }
    deck.counts = counts
  }, coalesce)
}

/** Print this deck (or the print list when null). */
export function setPrintDeck(deckId: Id | null) {
  commit((d) => {
    d.project.print = { ...d.project.print, deckId }
  })
}

export const deckSize = (deck: Deck) => Object.values(deck.counts).reduce((n, c) => n + c, 0)
