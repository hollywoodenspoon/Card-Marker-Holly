/**
 * Urban Warfare game state. Pure data, no React.
 * Rules: `game/urban-warfare/rulebook.md`.
 *
 * Zones are indexed 0–8 (rulebook zones 1–9), row by row; 4 is the center.
 */

export type Seat = 0 | 1
/** flag = Battleline Mech, nil = Advanced Mech, support = Logistics Mech, bomb = Fighter-Bomber. */
export type Kind = 'flag' | 'nil' | 'support' | 'bomb'
export const KINDS: Kind[] = ['flag', 'nil', 'support', 'bomb']
export const KIND_NAME: Record<Kind, string> = {
  flag: 'Battleline Mech',
  nil: 'Advanced Mech',
  support: 'Logistics Mech',
  bomb: 'Fighter-Bomber',
}
/** Cards of each kind a player gets. */
export const PER_PLAYER: Record<Kind, number> = { flag: 3, nil: 2, support: 2, bomb: 2 }

export interface UwCard {
  /** Instance id, e.g. "p0-3". */
  id: string
  /** The pack card it shows. */
  packId: string
  name: string
  kind: Kind
  /** Printed firepower. */
  fp: number
}

export interface Piece {
  card: UwCard
  owner: Seat
}

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface CenterHold {
  seat: Seat
  /** Opponent turns ended while this seat held the center. */
  oppTurns: number
}

/** Trial rule changes, all off by default (the rulebook as printed). */
export interface UwRules {
  /** The second player places one card on their first turn, not two. */
  oneEach?: boolean
  /** No pushing with a placed card on your first turn. */
  noFirstPush?: boolean
  /** The second player's first-turn cards may not go next to the center. */
  notBesideCenter?: boolean
  /** Hold the center through 3 opponent turns instead of 2. */
  hold3?: boolean
  /** Three of your Battleline Mechs in a row win at once, on your own turn. */
  instantLine?: boolean
}

export const RULE_NAMES: Record<keyof UwRules, string> = {
  oneEach: 'One card each on the first turn',
  noFirstPush: 'No pushing on your first turn',
  notBesideCenter: 'Second player’s first cards not next to the center',
  hold3: 'Hold the center for 3 turns',
  instantLine: 'Battleline wins at once on your turn',
}

export interface UwState {
  rules?: UwRules
  field: (Piece | null)[]
  hands: [UwCard[], UwCard[]]
  turn: Seat
  first: Seat
  turnsTaken: [number, number]
  /** Placements left this turn (2 on the second player's first turn). */
  placementsLeft: number
  /** Passes in a row. */
  passes: number
  /** Used Fighter-Bombers, per seat. */
  discard: [UwCard[], UwCard[]]
  centerHold: CenterHold | null
  winner: Seat | 'draw' | null
  reason: 'battleline' | 'objective' | 'attrition' | null
  log: string[]
}

export type UwMove =
  | { type: 'place'; card: string; zone: number; dir?: Dir }
  | { type: 'move'; from: number; dir: Dir }
  | { type: 'bomb'; card: string; target: number }
  | { type: 'pass' }

export const CENTER = 4
export const other = (s: Seat): Seat => (s === 0 ? 1 : 0)

/** Short list of the rules that are on, e.g. for a result or a replay. */
export const rulesLabel = (r: UwRules | undefined) => {
  const on = (Object.keys(RULE_NAMES) as (keyof UwRules)[])
    .filter((k) => r?.[k])
    .map((k) => RULE_NAMES[k])
  return on.length ? on.join(' · ') : 'Rulebook rules'
}
