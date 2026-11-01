/**
 * Who plays whom when Cause and Effect starts a card game. The player always plays
 * their own deck; the opponent plays a deck the game maker picked, or the deck of a
 * character who is a duelist in the league (so their deck moves with the world).
 */
import type { LCard } from '../league/cards'
import { makeDuelist } from '../league/duelists'
import type { Rng } from '../league/rng'
import type { Duelist, WorldState } from '../league/worldState'
import type { Args } from '../model/events'
import { deckList, type GameDoc } from '../model/game'
import { levelOf } from '../model/league'
import { PLAYER_DECK } from './world'

/** What a card game was last time: won, lost, or never started (no deck to play). */
export type LastGame = 'won' | 'lost' | 'declined'

interface DeckState {
  decks: Record<string, Record<string, number>>
  ownedDecks: string[]
}

/** The player's deck: the one they edit, else the starting deck, else "My deck". Null: none has cards. */
export function playerDeck(game: GameDoc, st: DeckState): { id: string; cards: string[] } | null {
  const ids = [...st.ownedDecks, game.economy.startingCards ?? '', PLAYER_DECK]
  for (const id of ids) {
    const cards = deckList({ counts: st.decks[id] ?? {} })
    if (cards.length) return { id, cards }
  }
  return null
}

export interface Opponent {
  /** Name shown on the table. */
  name: string
  cards: string[]
  /** A duelist made for this character just now: the caller adds it to the world. */
  created?: Duelist
}

/**
 * The opponent's deck. A deck picked in the step wins. Otherwise the character's
 * duelist is used (made on the spot when they have none yet, at the player's level).
 * Null: nobody to play with a deck.
 */
export function opponentOf(
  game: GameDoc,
  st: DeckState & { world: WorldState | null },
  a: Args,
  cards: LCard[],
  rng: Rng,
): Opponent | null {
  const ch = game.characters.find((c) => c.id === a.who)
  const deckId = String(a.deckB ?? '')
  const picked = deckId ? deckList({ counts: st.decks[deckId] ?? {} }) : []
  const label = ch?.name ?? game.decks.find((d) => d.id === deckId)?.name ?? 'Opponent'
  if (picked.length) return { name: label, cards: picked }
  if (!ch || !st.world) return null
  const own = st.world.duelists.find((d) => d.character === ch.id)
  if (own?.deck.length) return { name: ch.name, cards: own.deck }
  const level = levelOf(game.league, st.world.rating) ?? game.league.levels[0]
  if (!game.league.enabled || !level) return null
  const taken = new Set(st.world.duelists.map((d) => d.name))
  const made = {
    ...makeDuelist(game.league, rng, level, cards, taken),
    name: ch.name,
    character: ch.id,
    flags: [...(ch.flags ?? [])],
  }
  return made.deck.length ? { name: ch.name, cards: made.deck, created: made } : null
}
