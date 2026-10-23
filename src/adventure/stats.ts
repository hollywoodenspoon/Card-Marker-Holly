import { mirrored, neighbours } from './board'
import { inArchetype } from './effects/helpers'
import { rulesOf } from './effects/registry'
import { other, type AsState, type CombatLock, type Engagement, type Seat } from './state'

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
 * counts every attacker (or defender) instead. Worked out from the field as it
 * stands: before combat, and to lock the stacks when it starts.
 */
function liveSides(s: AsState, attacker: Seat): EngagementSides | null {
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

/** The stacks fixed when combat started: every card's values and both attacks' stacks. */
export function lockCombat(s: AsState): CombatLock {
  const values: CombatLock['values'] = {}
  for (const seat of [0, 1] as Seat[])
    s.players[seat].field.forEach((f, i) => {
      if (f.card) values[f.card] = statsAt(s, seat, i)
    })
  const stack = (attacker: Seat) => {
    const sides = liveSides(s, attacker)
    if (!sides) return null
    const own = s.players[attacker].field
    const theirs = s.players[other(attacker)].field
    return {
      origin: sides.main,
      target: sides.target,
      attack: sides.attackers.map((i) => own[i].card!),
      defense: sides.defenders.map((i) => theirs[i].card!),
    }
  }
  return { values, stacks: [stack(0), stack(1)] }
}

/**
 * The positions an Engagement counts. In combat these are the stacks formed
 * when it started (cards a swap moved between stacks included), plus the cards
 * an Unbound adds, whenever it was turned on. The Main Attacker only fixed
 * where the attack comes from and what it targets.
 */
export function engagementSides(s: AsState, attacker: Seat): EngagementSides | null {
  if (!s.combat) return liveSides(s, attacker)
  const lock = s.combat.stacks[attacker]
  if (!lock) return null
  const def = other(attacker)
  const own = s.players[attacker].field
  const theirs = s.players[def].field
  const slots = (field: typeof own, cards: string[]) =>
    cards.map((c) => field.findIndex((f) => f.card === c)).filter((i) => i >= 0)
  const attackers = new Set(slots(own, lock.attack))
  const defenders = new Set(slots(theirs, lock.defense))
  // Unbound counts every attacker (or defender), whenever it was used.
  const r = s.players[attacker].round
  const live = liveSides(s, attacker)
  if (live && (r.attackUnbound || (r.unbound ?? []).some((u) => u.side === 'attack')))
    for (const i of live.attackers) if (own[i].state === 'attacking') attackers.add(i)
  const rd = s.players[def].round
  if (live && (defenseUnbound(s, def) || (rd.unbound ?? []).some((u) => u.side === 'defense')))
    for (const i of live.defenders) defenders.add(i)
  return {
    main: lock.origin,
    target: lock.target,
    attackers: [...attackers].sort((a, b) => a - b),
    defenders: [...defenders].sort((a, b) => a - b),
  }
}

/** A card's Attack and Defense in an Engagement: as combat started, when it has started. */
export function valuesAt(s: AsState, seat: Seat, slot: number) {
  const card = s.players[seat].field[slot]?.card
  return (card && s.combat?.values[card]) || statsAt(s, seat, slot)
}

export function engagementTotals(s: AsState, e: Engagement): Totals {
  const sides = engagementSides(s, e.attacker)
  const def = other(e.attacker)
  const baseAttack = sides?.attackers.reduce((n, i) => n + valuesAt(s, e.attacker, i).a, 0) ?? 0
  const baseDefense = sides?.defenders.reduce((n, i) => n + valuesAt(s, def, i).d, 0) ?? 0
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
