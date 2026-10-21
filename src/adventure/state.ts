import type { AsCard } from './cards'
import type { Ctx, Option } from './effects/types'
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
  /** What abilities set up for this round (cleared each Skirmish). */
  round: RoundFlags
}

export interface RoundFlags {
  /** Attack Unbound (Hero of Rianz): every attacker counts. */
  attackUnbound: boolean
  /** Cards whose once-per-round ability was used. */
  used: string[]
  /** Cards that join the attackers whatever their Fate Number (Howling Barbarian). */
  extra: string[]
}

export const newRound = (): RoundFlags => ({ attackUnbound: false, used: [], extra: [] })

/** A card revealed as Fighting Spirit, with its value as revealed. */
export interface FsCard {
  card: string
  value: number
  from: 'support' | 'rest' | 'field'
}

/** The Engagement being fought: whose Main Attacker attacks, and the Fighting Spirit so far. */
export interface Engagement {
  attacker: Seat
  /** Fighting Spirit revealed in this Engagement, per seat. */
  fs: [FsCard[], FsCard[]]
  /** A pass locks that player's total for this Engagement. */
  passed: [boolean, boolean]
  /** Rest-zone coin cards already tried this Engagement (Gambler's Gambit). */
  tried: string[]
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
  /** A choice inside an ability (a target, a card to rest…). */
  | { k: 'choose'; seat: Seat; prompt: string; options: Option[] }
  | { k: 'over' }

/** Where the game goes on once an ability is resolved. */
export type After =
  /** More Flip Abilities from the same reveal, then the response. */
  | { k: 'flips'; respond: Seat }
  | { k: 'nextReveal' }
  | { k: 'assign' }
  | { k: 'fsTurn'; seat: Seat }

/** An ability being resolved: its answers so far, and what comes after it. */
export interface Pending {
  ctx: Ctx
  /** The card whose ability it is (a Doppelganger Thief copies another card's). */
  source: string
  answers: string[]
  after: After
}

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
  /** The ability being resolved. */
  pending: Pending | null
  /** Flip Abilities waiting to trigger (owner and card), from the last reveal. */
  flips: { owner: Seat; card: string }[]
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
