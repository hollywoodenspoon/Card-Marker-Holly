import type { AsCard } from './cards'
import { SLOTS } from './board'

/**
 * The rules state of one Adventure Scuffle game (Mutual Reveal mode). Plain
 * data only, so it can be saved, replayed and ported to the Godot game.
 */

export type Seat = 0 | 1
export const other = (s: Seat): Seat => (s === 0 ? 1 : 0)
export const SEATS: readonly Seat[] = [0, 1]

/** A field card's state (rulebook: Ready, or Active as attacking, defending or ability-active). */
export type CardState = 'ready' | 'attacking' | 'defending' | 'ability'

export interface Slot {
  /** A card id, or null for an empty position. */
  card: string | null
  faceUp: boolean
  state: CardState
}

export interface PlayerState {
  name: string
  /** 6 positions, index = row * 3 + column (see board.ts). */
  field: Slot[]
  /** Cards in hand. */
  support: string[]
  /** The rest zone, oldest first. */
  rest: string[]
  points: number
  /** The Main Attacker's position this round. */
  mainAttacker: number | null
  /** Cards revealed as Fighting Spirit this round; rested at Regroup. */
  spent: string[]
}

/** The Engagement being fought: whose Main Attacker attacks, and the Fighting Spirit so far. */
export interface Engagement {
  attacker: Seat
  /** Fighting Spirit revealed in this Engagement, per seat. */
  fs: [string[], string[]]
  /** A pass locks that player's total for this Engagement. */
  passed: [boolean, boolean]
}

export interface EngagementResult {
  attacker: Seat
  attack: number
  defense: number
  /** Who scored (null: a tie, or no Engagement). */
  scorer: Seat | null
  /** Why it ended without Fighting Spirit, if it did. */
  note?: 'no-attacker' | 'no-defenders'
}

/** Who must decide what, right now. */
export type Step =
  /** Put cards from Support (setup) or the rest zone (Regroup) on empty positions, face down. */
  | { k: 'place'; seat: Seat; from: 'support' | 'rest'; placed: number[] }
  /** Reveal cards on the opponent's field. */
  | { k: 'reveal'; seat: Seat; count: 1 | 2 }
  /** A response opportunity (Field or Support Ability, or pass). */
  | { k: 'respond'; seat: Seat; final: boolean }
  /** The initiative player picks the First Engagement. */
  | { k: 'first'; seat: Seat }
  /** Reveal a card as Fighting Spirit, or pass. */
  | { k: 'fs'; seat: Seat }
  | { k: 'over' }

export type Phase = 'setup' | 'skirmish' | 'combat' | 'regroup' | 'over'

export interface AsLogEntry {
  n: number
  text: string
  /** Something the rules don't settle, worth a look (e.g. a player without an attacker). */
  flag?: boolean
}

export interface AsState {
  v: 1
  /** Every card either player may use, by id. */
  cards: Record<string, AsCard>
  players: [PlayerState, PlayerState]
  initiative: Seat
  round: number
  phase: Phase
  step: Step
  /** Skirmish progress: reveals made this round, and who made the last one. */
  skirmish: { reveals: number; last: Seat | null }
  /** Engagements still to fight this round, by attacking seat. */
  queue: Seat[]
  engagement: Engagement | null
  results: EngagementResult[]
  /** The random number generator's state. */
  seed: number
  winner: { seat: Seat; reason: string } | null
  log: AsLogEntry[]
}

export const POINTS_TO_WIN = 4
/** Cards each player places on the field at the start. */
export const FIELD_CARDS = SLOTS

export const emptySlot = (): Slot => ({ card: null, faceUp: false, state: 'ready' })

export const cardName = (s: AsState, id: string | null) => (id && s.cards[id]?.name) || 'a card'
