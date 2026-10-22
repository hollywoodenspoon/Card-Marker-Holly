import { nextInt } from '@/playtest/rng'
import { colOf, slotName } from '../board'
import { cardName, other, type AsState, type Seat } from '../state'
import { rulesOf } from './registry'
import type { Ctx, D, Option, PlanIO } from './types'

/** The keyword helpers the card rules are written with. */

type S = AsState | D

let recorder: ((d: D) => void) | null = null

/** Watch every log line (`applyFrames`): called just before each line is added. */
export function recordLog(r: ((d: D) => void) | null) {
  recorder = r
}

export function log(d: D, text: string, flag?: boolean) {
  recorder?.(d)
  d.log.push(flag ? { n: d.log.length + 1, text, flag } : { n: d.log.length + 1, text })
}

/** A random whole number from 0 to n − 1, from the game's seed. */
export function rand(d: D, n: number) {
  const [v, seed] = nextInt(d.seed, n)
  d.seed = seed
  return v
}

/** A coin flip: true for Heads. */
export const coin = (d: D) => rand(d, 2) === 0

/**
 * Is the card of this archetype? Its `Archetype_AS` list decides when it has
 * one; otherwise its name containing the word does (Hero of Rianz is a Rianz card).
 */
export function inArchetype(s: S, card: string, word: string) {
  const c = s.cards[card]
  if (!c) return false
  if (c.archetypes?.length) return c.archetypes.some((a) => a.toLowerCase() === word.toLowerCase())
  return new RegExp(`\\b${word}\\b`, 'i').test(c.name)
}

/** Face-up cards on a player's field (abilities and "on your field" checks see only these). */
export const faceUp = (s: S, seat: Seat) =>
  s.players[seat].field.flatMap((f, slot) =>
    f.card && f.faceUp ? [{ card: f.card, slot, state: f.state }] : [],
  )

/** "If a [word] card is also on your field" (never counting the card itself). */
export const archOnField = (s: S, seat: Seat, word: string, self: string) =>
  faceUp(s, seat).some((x) => x.card !== self && inArchetype(s, x.card, word))

/** "If a [word] card is in your rest zone." */
export const archInRest = (s: S, seat: Seat, word: string, self: string) =>
  s.players[seat].rest.some((c) => c !== self && inArchetype(s, c, word))

export const restCount = (s: S, seat: Seat) => s.players[seat].rest.length
export const isCenterSlot = (slot: number) => colOf(slot) === 1

export const slotOf = (s: S, seat: Seat, card: string) =>
  s.players[seat].field.findIndex((f) => f.card === card)

/** A field position as a choice, named as its owner's opponent may know it. */
export const slotOption = (s: S, seat: Seat, slot: number, viewer: Seat): Option => {
  const f = s.players[seat].field[slot]
  const known = f.card && (f.faceUp || viewer === seat)
  return {
    id: `slot:${seat}:${slot}`,
    label: `${known ? cardName(s as AsState, f.card) : 'Face-down card'} (${slotName(slot)})`,
    seat,
    slot,
    card: f.card ?? undefined,
  }
}

export const cardOption = (s: S, card: string, prefix = 'card'): Option => ({
  id: `${prefix}:${card}`,
  label: cardName(s as AsState, card),
  card,
})

export const slotFromId = (id: string) => Number(id.split(':')[2])
export const cardFromId = (id: string) => id.slice(id.indexOf(':') + 1)

/**
 * May an ability with this context touch that card? An opponent's Field
 * Ability can't target a Crimson Duelist; an opponent's ability can't move a
 * Ranger of the Tower (`move`).
 */
export function touchable(
  s: S,
  ctx: Ctx,
  seat: Seat,
  slot: number,
  how: { target?: boolean; move?: boolean },
) {
  const card = s.players[seat].field[slot]?.card
  if (!card) return false
  if (seat === ctx.owner) return true
  const r = rulesOf(s, card)
  // Protections only count once the card is face up (known).
  const up = s.players[seat].field[slot].faceUp
  if (up && how.target && ctx.mode === 'field' && r?.fieldProof) return false
  if (up && how.move && r?.fixed) return false
  return true
}

/** Cards that may pay a Rest cost: Support cards other than the ability's own, not one that can't. */
export const payable = (s: S, seat: Seat, self: string) =>
  s.players[seat].support.filter((c) => c !== self && !rulesOf(s, c)?.unpayable)

export const canPay = (s: S, seat: Seat, self: string, n: number) =>
  payable(s, seat, self).length >= n

/** Ask the owner for N Support cards to rest. */
export function restCost(io: PlanIO, n: number): string[] {
  const picked: string[] = []
  for (let i = 0; i < n; i++) {
    const left = payable(io.s, io.ctx.owner, io.ctx.card).filter(
      (c) => !picked.includes(c) && !io.reserved.includes(c),
    )
    picked.push(
      cardFromId(
        io.pick(
          io.ctx.owner,
          `Rest ${n}: choose a Support card to rest${n > 1 ? ` (${i + 1} of ${n})` : ''}.`,
          left.map((c) => cardOption(io.s, c)),
        ),
      ),
    )
    io.reserved.push(picked[i])
  }
  return picked
}

/** Take a card out of wherever it is (field, Support, rest zone, spent Fighting Spirit). */
export function lift(d: D, seat: Seat, card: string) {
  const p = d.players[seat]
  const slot = p.field.findIndex((f) => f.card === card)
  if (slot >= 0) p.field[slot] = { card: null, faceUp: false, state: 'ready' }
  for (const list of [p.support, p.rest, p.spent]) {
    const i = list.indexOf(card)
    if (i >= 0) list.splice(i, 1)
  }
}

/** Rest a card. A Runaway Familiar goes to Support instead. */
export function rest(d: D, seat: Seat, card: string) {
  lift(d, seat, card)
  if (rulesOf(d, card)?.runaway) {
    d.players[seat].support.push(card)
    log(
      d,
      `${cardName(d, card)} runs back to ${d.players[seat].name}'s Support instead of resting.`,
    )
  } else d.players[seat].rest.push(card)
}

export function toSupport(d: D, seat: Seat, card: string) {
  lift(d, seat, card)
  d.players[seat].support.push(card)
}

/** "Opponent rests a card from their Support" (the opponent chooses). */
export function opponentRestsPlan(io: PlanIO): string | null {
  const opp = other(io.ctx.owner)
  const sup = io.s.players[opp].support
  if (!sup.length) return null
  return cardFromId(
    io.pick(
      opp,
      'choose a card from your Support to rest.',
      sup.map((c) => cardOption(io.s, c)),
    ),
  )
}

export function opponentRestsApply(d: D, ctx: Ctx, card: string | null) {
  const opp = other(ctx.owner)
  if (!card) return log(d, `${d.players[opp].name} has no Support card to rest.`)
  log(d, `${d.players[opp].name} rests ${cardName(d, card)} from their Support.`)
  rest(d, opp, card)
}

/** Swap the contents of two field positions (cards keep their face and state). */
export function swapSlots(d: D, a: { seat: Seat; slot: number }, b: { seat: Seat; slot: number }) {
  const fa = d.players[a.seat].field[a.slot]
  const fb = d.players[b.seat].field[b.slot]
  d.players[a.seat].field[a.slot] = { ...fb }
  d.players[b.seat].field[b.slot] = { ...fa }
}

/**
 * Put a card from Support on the field in place of another, with that card's
 * face and (unless `ready`) its state. The replaced card goes to Support.
 */
export function swapIn(d: D, seat: Seat, slot: number, card: string, ready: boolean) {
  const p = d.players[seat]
  const old = p.field[slot]
  const i = p.support.indexOf(card)
  if (i >= 0) p.support.splice(i, 1)
  p.field[slot] = { card, faceUp: old.faceUp, state: ready ? 'ready' : old.state }
  if (old.card) p.support.push(old.card)
}
