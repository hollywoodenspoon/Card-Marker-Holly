/**
 * A card game asked for by a running Engine game ("Start a card game"): Play opens
 * the game's cards, starts the match with the given decks, and hands the result
 * back when the player returns. Kept here, with no Engine imports, so Play never
 * depends on the Engine.
 */
import { create } from 'zustand'
import type { Move } from '@/adventure/engine'

/** What a paused card game needs to start again: the seed and every move made so far. */
export interface PausedMatch {
  seed: number
  moves: Move[][]
}

export interface MatchResult {
  winner: number | null
  finished: boolean
  /** Set when the player paused to save: the game is carried on from this later. */
  paused?: PausedMatch
}

export interface MatchRequest {
  /** The Engine game (Play's pack id while it runs). */
  gameId: string
  gameName: string
  /** Card ids, one entry per copy: the player's deck, then the opponent's. */
  decks: [string[], string[]]
  names: [string, string]
  /** The opponent's bot level, or null for two people on one device. */
  bot: 'easy' | 'normal' | 'hard' | null
  /** Carry on a paused game instead of starting a new one. */
  resume?: PausedMatch
  /** The words on the pause button (the game's own text). Absent: the game cannot be paused. */
  pauseLabel?: string
  /** Set once the table has started it. */
  started?: boolean
  done: (result: MatchResult) => void
}

export const useHandoff = create<{ req: MatchRequest | null }>(() => ({ req: null }))

export const requestMatch = (req: MatchRequest) => useHandoff.setState({ req })

/** Return to the game that asked, with the match's result. */
export function finishMatch(result: MatchResult) {
  const req = useHandoff.getState().req
  useHandoff.setState({ req: null })
  req?.done(result)
}
