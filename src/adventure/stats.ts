import { mirrored, neighbours } from './board'
import { inArchetype } from './effects/helpers'
import { rulesOf } from './effects/registry'
import { other, type AsState, type Engagement, type Seat } from './state'

/** A field card's printed values. */
const printed = (s: AsState, card: string) => ({
  a: s.cards[card]?.a ?? 0,
  d: s.cards[card]?.d ?? 0,
})

/** A field card's Attack and Defense now: printed, plus its Inherent changes while face up. */
export function statsAt(s: AsState, seat: Seat, slot: number): { a: number; d: number } {
  const f = s.players[seat].field[slot]
  if (!f?.card) return { a: 0, d: 0 }
  const v = printed(s, f.card)
  const r = rulesOf(s, f.card)
  return f.faceUp && r?.stat ? r.stat(s, seat, slot, v) : v
}

export const attackAt = (s: AsState, seat: Seat, slot: number) => statsAt(s, seat, slot).a
export const defenseAt = (s: AsState, seat: Seat, slot: number) => statsAt(s, seat, slot).d

/** A Fighting Spirit card's printed value (its Battle Ability is applied when it is revealed). */
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

/** Defense Unbound: a face-up card on the field says so (Necromancer of Rotos). */
export const defenseUnbound = (s: AsState, seat: Seat) =>
  s.players[seat].field.some(
    (f) => f.card && f.faceUp && rulesOf(s, f.card)?.defenseUnbound?.(s, seat),
  )

/**
 * Attack = the Main Attacker plus attacking cards next to it. Defense = the
 * defending cards on or next to the attacked (mirrored) position. Unbound
 * counts every attacker (or defender) instead.
 */
export function engagementSides(s: AsState, attacker: Seat): EngagementSides | null {
  const main = s.players[attacker].mainAttacker
  if (main === null) return null
  const def = other(attacker)
  const own = s.players[attacker].field
  const theirs = s.players[def].field
  const target = mirrored(main)
  const all = [0, 1, 2, 3, 4, 5]
  /** Slots a round's "non-adjacent cards are counted" ability adds for one side. */
  const unbound = (seat: Seat, side: 'attack' | 'defense') => {
    const field = s.players[seat].field
    const list = (s.players[seat].round.unbound ?? []).filter((u) => u.side === side)
    if (list.some((u) => !u.word)) return all
    return all.filter((i) => {
      const card = field[i].card
      return card && list.some((u) => inArchetype(s, card, u.word!))
    })
  }
  const near = (slot: number) => [slot, ...neighbours(slot)]
  const atkSlots = s.players[attacker].round.attackUnbound
    ? all
    : [...new Set([...near(main), ...unbound(attacker, 'attack')])]
  const defSlots = defenseUnbound(s, def)
    ? all
    : [...new Set([...near(target), ...unbound(def, 'defense')])]
  const attackers = atkSlots.filter((i) => own[i].card && own[i].state === 'attacking')
  if (!attackers.includes(main)) attackers.push(main)
  const defenders = defSlots.filter((i) => theirs[i].card && theirs[i].state === 'defending')
  return {
    main,
    target,
    attackers: attackers.sort((a, b) => a - b),
    defenders: defenders.sort((a, b) => a - b),
  }
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
  const fs = (seat: Seat) => e.fs[seat].reduce((n, x) => n + x.value, 0)
  return {
    baseAttack,
    baseDefense,
    attack: baseAttack + fs(e.attacker),
    defense: baseDefense + fs(def),
  }
}

/**
 * Final Blow: the bonus of the last Fighting Spirit revealed, if its card has
 * Final Blow. It's added when the Engagement ends (until then it's pending).
 */
export function finalBlow(
  s: AsState,
  e: Engagement,
): { seat: Seat; card: string; n: number } | null {
  const last = e.last
  const entry = last && e.fs[last.seat][last.index]
  const n = entry && rulesOf(s, entry.card)?.finalBlow
  return last && entry && n ? { seat: last.seat, card: entry.card, n } : null
}
