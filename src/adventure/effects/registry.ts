import type { AsState } from '../state'
import { CARD_RULES } from './cards'
import type { CardRules } from './types'

/** A card's rules, by its code (Code_AS). Cards without an entry play with their stats only. */
export const rulesOf = (s: Pick<AsState, 'cards'>, card: string): CardRules | undefined =>
  CARD_RULES[s.cards[card]?.code ?? '']

export const implemented = (code: string) => code in CARD_RULES
