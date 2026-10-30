/**
 * Game modules plug into the engine here. A module brings only what is specific to
 * its game: how to build a good deck from its cards, how to start one of its card
 * games on the table, and its own Cause and Effect pieces (registered with the
 * pieces registry). Everything else in the engine stays general.
 */
import type { PackCard } from '@/playtest/pack'
import type { DeckLevel } from '../model/game'

export interface DeckBuildRequest {
  /** Where the module may cache its work (the game's id). */
  cacheKey: string
  /** The whole card pool (for card values), and the cards the deck may use. */
  pool: PackCard[]
  from: PackCard[]
  level: DeckLevel
  seed: number
  /** Decks to test a very optimal deck against. */
  gauntlet: string[][]
  onProgress?: (part: number) => void
  stopped?: () => boolean
}

export interface DeckBuilderDef {
  id: string
  label: string
  /** Whether these cards are this module's cards. */
  canBuild: (cards: PackCard[]) => boolean
  /** A deck as card ids (one entry per copy), or null when stopped. */
  build: (req: DeckBuildRequest) => Promise<string[] | null>
}

export interface GameModule {
  id: string
  name: string
  deckBuilder?: DeckBuilderDef
}

const modules: GameModule[] = []

export function registerModule(m: GameModule) {
  if (!modules.some((x) => x.id === m.id)) modules.push(m)
}

export const allModules = (): readonly GameModule[] => modules

/** The deck builder that knows these cards, if any module does. */
export const deckBuilderFor = (cards: PackCard[]) =>
  modules.find((m) => m.deckBuilder?.canBuild(cards))?.deckBuilder ?? null
