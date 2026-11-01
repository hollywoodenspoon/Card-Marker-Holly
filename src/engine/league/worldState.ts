/**
 * The league's world while a game is played: who the duelists are, which cards are
 * out and banned, what the market looks like, and the tournament the player is in.
 * Plain data (saved with the game); the rules that move it live in the other
 * league modules, and the numbers they use are the game's League settings.
 */
import type { Tourney } from './bracket'

export interface Duelist {
  id: string
  name: string
  region: string
  rating: number
  /** Card ids, one per copy. */
  deck: string[]
  /** "important", "rival"… free words. */
  flags: string[]
  /** A character of the game this duelist is (null: made up by the world). */
  character: string | null
  /** Tournaments played. */
  played: number
}

export interface ResultLog {
  week: number
  tournament: string
  name: string
  /** The top finishers' decks. */
  decks: string[][]
}

export interface HistoryRow {
  week: number
  tournament: string
  name: string
  place: number
  of: number
  prize: number
  points: number
}

export interface ActiveTournament {
  defId: string
  name: string
  tourney: Tourney
  /** The game's deck the player plays with. */
  deckId: string
  week: number
  /** Where the player stands: playing a match, watching, or finished. */
  phase: 'play' | 'spectate' | 'done'
  /** A variable (number) that gets the player's place when it ends. */
  placeVar?: string
}

export interface PendingBan {
  /** The week it comes into force. */
  week: number
  add: string[]
  remove: string[]
}

export interface WorldState {
  seed: number
  rating: number
  region: string
  duelists: Duelist[]
  /** Cards in circulation. Empty: nothing has been released yet, so every card is out. */
  released: string[]
  releaseLog: { week: number; release: string; name: string; cards: string[] }[]
  banned: string[]
  pendingBan: PendingBan | null
  banLog: { week: number; add: string[]; remove: string[] }[]
  results: ResultLog[]
  /** Points by track. */
  points: Record<string, number>
  history: HistoryRow[]
  prices: Record<string, number>
  /** Copies in circulation, by card (grows with boosters supplied). */
  supply: Record<string, number>
  /** Share (percent) of recent top decks that run each card. */
  usage: Record<string, number>
  /** Stock left in limited shop entries, keyed "shopId:entryId". */
  stock: Record<string, number>
  seenHints: string[]
  active: ActiveTournament | null
  /** The last week the world step ran for. */
  lastStep: number
  /** The week each tournament last ran. */
  ran: Record<string, number>
}

export const emptyWorld = (seed: number, rating: number, region: string): WorldState => ({
  seed,
  rating,
  region,
  duelists: [],
  released: [],
  releaseLog: [],
  banned: [],
  pendingBan: null,
  banLog: [],
  results: [],
  points: {},
  history: [],
  prices: {},
  supply: {},
  usage: {},
  stock: {},
  seenHints: [],
  active: null,
  lastStep: 0,
  ran: {},
})

/** The cards of a pool that have been released (all of them before the first release). */
export function inCirculation<T extends { id: string }>(w: WorldState | null, cards: T[]): T[] {
  if (!w?.released.length) return cards
  const out = new Set(w.released)
  return cards.filter((c) => out.has(c.id))
}

/** The banned cards a deck (one id per copy) uses. */
export const bannedIn = (w: WorldState | null, deck: string[]): string[] =>
  w ? [...new Set(deck.filter((id) => w.banned.includes(id)))] : []
