import { apply } from './engine'
import type { Seat, UwMove, UwState } from './state'
import type { UwLevel } from './bot'

/** A recorded Urban Warfare match: the start and every move, enough to play it back. */
export interface UwReplay {
  id: string
  packId: string
  savedAt: number
  /** Per seat: the bot level, or null for a person. */
  bots: [UwLevel | null, UwLevel | null]
  winner: Seat | 'draw' | null
  reason: UwState['reason']
  start: UwState
  moves: UwMove[]
}

/** Every state of the match, the start first. */
export function replayStates(r: Pick<UwReplay, 'start' | 'moves'>): UwState[] {
  const out = [r.start]
  for (const m of r.moves) out.push(apply(out[out.length - 1], m))
  return out
}

export const seatName = (r: Pick<UwReplay, 'bots'>, seat: Seat) =>
  r.bots[seat] ? `Bot (${r.bots[seat] === 'easy' ? 'Easy' : 'Normal'})` : `Player ${seat + 1}`
