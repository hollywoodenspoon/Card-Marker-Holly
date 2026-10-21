import { mirrored, neighbours } from './board'
import { other, type AsState, type Engagement, type Seat } from './state'

/**
 * A card's current values. Card abilities (positional, conditional, Unbound…)
 * change these in a later version; for now they are the printed values.
 */
export function attackAt(s: AsState, seat: Seat, slot: number): number {
  const card = s.players[seat].field[slot]?.card
  return card ? (s.cards[card]?.a ?? 0) : 0
}

export function defenseAt(s: AsState, seat: Seat, slot: number): number {
  const card = s.players[seat].field[slot]?.card
  return card ? (s.cards[card]?.d ?? 0) : 0
}

export function fightingSpirit(s: AsState, _seat: Seat, card: string): number {
  return s.cards[card]?.fs ?? 0
}

/** The positions an Engagement counts: the Main Attacker and its helpers, the target and its defenders. */
export interface EngagementSides {
  main: number
  target: number
  attackers: number[]
  defenders: number[]
}

/**
 * Attack = the Main Attacker plus attacking cards next to it. Defense = the
 * defending cards on or next to the attacked (mirrored) position.
 */
export function engagementSides(s: AsState, attacker: Seat): EngagementSides | null {
  const main = s.players[attacker].mainAttacker
  if (main === null) return null
  const own = s.players[attacker].field
  const theirs = s.players[other(attacker)].field
  const target = mirrored(main)
  const attackers = [main, ...neighbours(main)].filter(
    (i) => own[i].card && own[i].state === 'attacking',
  )
  const defenders = [target, ...neighbours(target)].filter(
    (i) => theirs[i].card && theirs[i].state === 'defending',
  )
  return { main, target, attackers: attackers.sort((a, b) => a - b), defenders }
}

export interface Totals {
  attack: number
  defense: number
  /** The starting totals, before Fighting Spirit. */
  baseAttack: number
  baseDefense: number
}

export function engagementTotals(s: AsState, e: Engagement): Totals {
  const sides = engagementSides(s, e.attacker)
  const def = other(e.attacker)
  const baseAttack = sides?.attackers.reduce((n, i) => n + attackAt(s, e.attacker, i), 0) ?? 0
  const baseDefense = sides?.defenders.reduce((n, i) => n + defenseAt(s, def, i), 0) ?? 0
  const fs = (seat: Seat) => e.fs[seat].reduce((n, c) => n + fightingSpirit(s, seat, c), 0)
  return {
    baseAttack,
    baseDefense,
    attack: baseAttack + fs(e.attacker),
    defense: baseDefense + fs(def),
  }
}
