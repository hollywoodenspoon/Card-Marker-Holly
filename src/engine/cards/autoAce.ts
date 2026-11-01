/**
 * Adventure Scuffle! cards mark an Ace as {ace} in their name (Name_AS). When a game's
 * cards look like that set and the game has no Ace setting yet, this says what to set,
 * so games made before the template knew about Aces don't need it done by hand.
 */
import { isAdventurePack } from '@/adventure/cards'
import type { PackCard } from '@/playtest/pack'
import type { Economy } from '../model/economy'

export const AS_ACE_FIELD = 'Name_AS'
export const AS_ACE_TEXT = '{ace}'

/** The Ace setting to fill in, or null when the game has one already or the cards aren't that set. */
export function autoAce(
  economy: Pick<Economy, 'aceField' | 'aceText'>,
  cards: PackCard[],
): { aceField: string; aceText: string } | null {
  if (economy.aceField || economy.aceText.trim()) return null
  if (!isAdventurePack(cards) || !cards.some((c) => AS_ACE_FIELD in c.fields)) return null
  return { aceField: AS_ACE_FIELD, aceText: AS_ACE_TEXT }
}
