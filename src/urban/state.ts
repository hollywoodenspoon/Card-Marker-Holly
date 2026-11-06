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

export interface UwState {
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
