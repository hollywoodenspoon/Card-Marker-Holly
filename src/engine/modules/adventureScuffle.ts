/**
 * The Adventure Scuffle! module: only what the engine can't know on its own. Deck
 * building at three levels with the builder Play already has (card values from a
 * bot league, then a greedy build, then bot-tested climbing for very optimal), and
 * its Cause and Effect pieces (see ../events/asPieces.ts).
 */
import { cardsFromPack, isAdventurePack } from '@/adventure/cards'
import { buildDeck } from '@/adventure/deckgen/build'
import { cardValues, veryOptimalDeck } from '@/playtest-app/decks/deckgenClient'
import { registerModule } from './registry'

export function registerAdventureScuffle() {
  registerModule({
    id: 'adventure-scuffle',
    name: 'Adventure Scuffle!',
    deckBuilder: {
      id: 'adventure-scuffle',
      label: 'Adventure Scuffle! deck builder',
      canBuild: (cards) => isAdventurePack(cards),
      build: async (r) => {
        const pool = cardsFromPack(r.pool).cards
        const allowed = new Set(r.from.map((c) => c.id))
        const from = pool.filter((c) => allowed.has(c.id))
        // Values are worked out once for the whole pool (cached), then any subset builds from them.
        const values = await cardValues(
          r.cacheKey,
          pool,
          (p) => r.onProgress?.(r.level === 'veryOptimal' ? p / 2 : p),
          r.stopped,
        )
        if (!values) return null
        if (r.level !== 'veryOptimal') return buildDeck(from, values, r.level, r.seed).cards
        return veryOptimalDeck(
          from,
          values,
          r.gauntlet,
          r.seed,
          (p) => r.onProgress?.(0.5 + p / 2),
          r.stopped,
        )
      },
    },
  })
}
