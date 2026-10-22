import type { AsCard } from '../cards'
import type { AsState } from '../state'
import { readCard } from './reader'
import type { CardRules } from './types'

/**
 * A card's rules, read from its printed ability. A card whose text the reader
 * can't fully read plays with its stats only.
 */
export const rulesOf = (s: Pick<AsState, 'cards'>, card: string): CardRules | undefined => {
  const c = s.cards[card]
  return (c && readCard(c).rules) || undefined
}

/** Can the rules engine read this card's ability? */
export const implemented = (card: Pick<AsCard, 'type' | 'ability'>) => readCard(card).rules !== null

/** The parts of a card's ability the rules engine can't read (empty: all of it). */
export const unreadParts = (card: Pick<AsCard, 'type' | 'ability'>) => readCard(card).unread
