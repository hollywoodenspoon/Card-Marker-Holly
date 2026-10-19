import type { Card, Id, Keyword, Project } from '@/core/model/types'
import type { ResolveContext } from './resolve'

const NO_KEYWORDS: Keyword[] = []
const positions = new WeakMap<Record<Id, Card>, Map<Id, number>>()

/** 0-based position of each card in the Cards list (cached per cards object). */
function positionsOf(cards: Record<Id, Card>) {
  let m = positions.get(cards)
  if (!m) {
    m = new Map(
      Object.values(cards)
        .sort((a, b) => a.order - b.order)
        .map((c, i) => [c.id, i]),
    )
    positions.set(cards, m)
  }
  return m
}

/**
 * Number, total and keywords for resolving one card. Without a card (template
 * mode) the first number is used as a preview.
 */
export function cardContext(
  project: Pick<Project, 'numberStart' | 'keywords'>,
  cards: Record<Id, Card>,
  cardId?: Id,
): Required<ResolveContext> {
  const start = project.numberStart ?? 1
  const pos = cardId !== undefined ? positionsOf(cards).get(cardId) : undefined
  return {
    number: start + (pos ?? 0),
    total: Object.keys(cards).length,
    keywords: project.keywords ?? NO_KEYWORDS,
  }
}
