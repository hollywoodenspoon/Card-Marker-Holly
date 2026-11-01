import type { AsCard } from '@/adventure/cards'
import { checkDeck } from '@/adventure/deck'
import { buildDeck, notesFor, type DeckLevel } from '@/adventure/deckgen/build'
import { randomSeed } from '@/playtest/rng'
import { cardValues, veryOptimalDeck } from './deckgenClient'

/**
 * Auto-build one Free Company from the whole pack at a level, for the Decks
 * screen and the table's "Auto Build" deck choice. The first time (and after
 * the cards change) the pack's card values are worked out from bot games;
 * Very optimal also tunes its deck with games against the pack's decks.
 * Returns null when stopped.
 */
export async function autoBuildDeck(
  packId: string,
  cards: AsCard[],
  packDecks: string[][],
  level: DeckLevel,
  progress: (text: string, part: number) => void,
  stopped: () => boolean,
): Promise<{ ids: string[]; notes: string[] } | null> {
  progress('Working out how strong each card is (bot games)…', 0)
  const values = await cardValues(
    packId,
    cards,
    (p) => progress('Working out how strong each card is (bot games)…', p),
    stopped,
  )
  if (!values) return null
  const seed = randomSeed()
  let ids: string[]
  if (level === 'veryOptimal') {
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
    const gauntlet = packDecks.filter((d) => checkDeck(d, byId).ok)
    progress('Tuning the deck with games against the pack decks…', 0)
    ids = await veryOptimalDeck(
      cards,
      values,
      gauntlet,
      seed,
      (p) => progress('Tuning the deck with games against the pack decks…', p),
      stopped,
    )
  } else ids = buildDeck(cards, values, level, seed).cards
  return { ids, notes: notesFor(ids, cards, values) }
}
