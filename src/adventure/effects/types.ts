import type { Draft } from 'immer'
import type { AsState, Engagement, Seat } from '../state'

/**
 * What a card's ability can do, as data and small functions. The reader
 * (`reader.ts`) builds them from each card's printed ability text; the engine
 * asks the registry for them.
 */

/** Who is using an ability, with which card, and how. */
export interface Ctx {
  owner: Seat
  card: string
  mode: 'field' | 'support' | 'flip' | 'battle'
}

/** One answer to a choice. Board options name their seat and slot, so the table can highlight them. */
export interface Option {
  id: string
  label: string
  seat?: Seat
  slot?: number
  card?: string
}

export interface PlanIO {
  s: AsState
  ctx: Ctx
  /** Ask `seat` to choose. With no options the ability can't go on (nothing happens). */
  pick(seat: Seat, prompt: string, options: Option[]): string
  /** Support cards already promised to a cost in this plan (a copied ability pays its own cost too). */
  reserved: string[]
}

/**
 * An ability that may need choices. `plan` only reads the state and asks;
 * it runs again after every answer. `apply` then changes the state once.
 */
export interface Ability<P = unknown> {
  /** Shown on the button, e.g. "Opponent rests a Support card". */
  name: string
  /** "You may…": the owner is asked first whether to use it. */
  optional?: boolean
  /** Can it be used (or does it trigger) now? */
  can?(s: AsState, ctx: Ctx): boolean
  plan(io: PlanIO): P
  apply(d: Draft<AsState>, ctx: Ctx, plan: P): void
  /** Support Abilities: stay in Support after use instead of resting. */
  keep?(d: Draft<AsState>, ctx: Ctx): boolean
}

/** A rest-zone card that may be used for Fighting Spirit (Rest Ability). */
export interface RestFs {
  can(s: AsState, seat: Seat, card: string): boolean
  bonus: number
  /** Gambler's Gambit: a coin decides, once per Engagement. */
  coin?: boolean
}

export interface CardRules {
  /** Inherent A/D changes while face up on the field. */
  stat?(s: AsState, seat: Seat, slot: number, v: { a: number; d: number }): { a: number; d: number }
  /** Fighting Spirit when revealed (Battle conditions), from the printed value. */
  fs?(s: AsState, seat: Seat, e: Engagement, printed: number, card: string): number
  /** Coin-Toss Bravo: Fighting Spirit by a coin instead of the printed value. */
  fsCoin?: { heads: number; tails: number }
  field?: Ability
  support?: Ability
  flip?: Ability
  /** Resolved right after the card is revealed as Fighting Spirit. */
  battle?: Ability
  restFs?: RestFs
  /** Can't be the target of an opponent's Field Ability. */
  fieldProof?: boolean
  /** Can't be moved or swapped off the field by an opponent's ability. */
  fixed?: boolean
  /** Defense Unbound while face up on its owner's field. */
  defenseUnbound?(s: AsState, seat: Seat): boolean
  /** Goes to Support instead whenever it would be rested. */
  runaway?: boolean
  /** Can't be rested to pay a cost. */
  unpayable?: boolean
  /** Copies other abilities, so it can't be copied itself. */
  copies?: boolean
}

export type D = Draft<AsState>
