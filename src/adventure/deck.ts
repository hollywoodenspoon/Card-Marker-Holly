import type { AsCard } from './cards'

/**
 * Free Company rules (rulebook, "Building a Free Company"): exactly 12 cards,
 * one copy of each, at most one Ace. Packs that aren't Adventure Scuffle packs
 * use the same size and copy rules without the Ace check.
 */
export const DECK_SIZE = 12
export const MAX_ACES = 1

export interface DeckCheck {
  ok: boolean
  /** Plain-language problems, empty when the deck is legal. */
  problems: string[]
  size: number
  aces: number
}

export function checkDeck(cardIds: string[], cards: Record<string, AsCard | undefined>): DeckCheck {
  const problems: string[] = []
  const size = cardIds.length
  if (size !== DECK_SIZE)
    problems.push(
      size < DECK_SIZE
        ? `${DECK_SIZE - size} more card${DECK_SIZE - size === 1 ? '' : 's'} needed (a Free Company has ${DECK_SIZE}).`
        : `${size - DECK_SIZE} card${size - DECK_SIZE === 1 ? '' : 's'} too many (a Free Company has ${DECK_SIZE}).`,
    )
  const seen = new Set<string>()
  const doubles = new Set<string>()
  for (const id of cardIds) {
    if (seen.has(id)) doubles.add(id)
    seen.add(id)
  }
  for (const id of doubles)
    problems.push(`${cards[id]?.name ?? 'A card'} is in the deck more than once (one copy each).`)
  const missing = cardIds.filter((id) => !cards[id])
  if (missing.length)
    problems.push(
      `${missing.length} card${missing.length === 1 ? ' is' : 's are'} no longer in this pack.`,
    )
  const aces = [...seen].filter((id) => cards[id]?.ace).length
  if (aces > MAX_ACES) problems.push(`${aces} Aces; a Free Company may have at most ${MAX_ACES}.`)
  return { ok: problems.length === 0, problems, size, aces }
}
