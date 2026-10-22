import { slotName } from '../board'
import { cardName, other, type AsState, type Seat } from '../state'
import {
  cardFromId,
  cardOption,
  faceUp,
  log,
  inArchetype,
  isLocked,
  opponentRestsApply,
  opponentRestsPlan,
  rand,
  restCost,
  rest,
  slotFromId,
  slotOption,
  swapIn,
  swapSlots,
  touchable,
} from './helpers'
import { rulesOf } from './registry'
import type { Ability, Ctx, D, PlanIO } from './types'

/**
 * The abilities the card reader (`reader.ts`) builds card rules from. Each
 * is written from the owner's side (`ctx.owner`), so a copied ability works
 * for whoever copies it.
 */

export const initiative = (s: AsState, seat: Seat) => s.initiative === seat
/** Engagements fought this round (not counting a player who had no attacker). */
export const fought = (s: AsState) => s.results.filter((r) => r.note !== 'no-attacker')

export const opponentRests: Ability<string | null> = {
  name: 'Opponent rests a Support card',
  plan: opponentRestsPlan,
  apply: opponentRestsApply,
}

/** Swap target opponent's card's position with another card on their field. */
export function opponentPositionSwap(): Ability<[number, number]> {
  return {
    name: "Swap two of the opponent's field cards",
    plan(io) {
      const opp = other(io.ctx.owner)
      const slots = io.s.players[opp].field.map((_, i) => i)
      const a = slotFromId(
        io.pick(
          io.ctx.owner,
          "Choose the opponent's card to move.",
          slots
            .filter((i) => touchable(io.s, io.ctx, opp, i, { target: true, move: true }))
            .map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
        ),
      )
      const b = slotFromId(
        io.pick(
          io.ctx.owner,
          'Choose the card it swaps places with.',
          slots
            .filter((i) => i !== a && touchable(io.s, io.ctx, opp, i, { move: true }))
            .map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
        ),
      )
      return [a, b]
    },
    apply(d, ctx, [a, b]) {
      const opp = other(ctx.owner)
      log(
        d,
        `${cardName(d, ctx.card)}: ${d.players[opp].name}'s ${slotName(a)} and ${slotName(b)} cards swap places.`,
      )
      swapSlots(d, { seat: opp, slot: a }, { seat: opp, slot: b })
    },
  }
}

/** Swap target opponent's ready card on the field with a random card from their Support. */
export const opponentSwapOut: Ability<number> = {
  name: "Swap an opponent's ready card with a random Support card",
  can: (s, ctx) => s.players[other(ctx.owner)].support.length > 0,
  plan(io) {
    const opp = other(io.ctx.owner)
    return slotFromId(
      io.pick(
        io.ctx.owner,
        "Choose the opponent's ready card to swap out.",
        io.s.players[opp].field
          .map((_, i) => i)
          .filter(
            (i) =>
              io.s.players[opp].field[i].state === 'ready' &&
              touchable(io.s, io.ctx, opp, i, { target: true, move: true }),
          )
          .map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
      ),
    )
  },
  apply(d, ctx, slot) {
    const opp = other(ctx.owner)
    const sup = d.players[opp].support
    if (!sup.length) return
    const card = sup[rand(d, sup.length)]
    const old = d.players[opp].field[slot]
    log(
      d,
      `${cardName(d, ctx.card)}: ${old.faceUp ? cardName(d, old.card) : 'a face-down card'} goes back to ${d.players[opp].name}'s Support and a random Support card takes its place${old.faceUp ? ` (${cardName(d, card)})` : ''}.`,
    )
    swapIn(d, opp, slot, card, false)
  },
}

/** Swap a card on your field with a card from your Support. The card placed on the field is Ready. */
export const ownSwapIn: Ability<[number, string]> = {
  name: 'Swap a field card with a Support card',
  plan(io) {
    const p = io.s.players[io.ctx.owner]
    const slot = slotFromId(
      io.pick(
        io.ctx.owner,
        'Choose a card on your field to swap out.',
        p.field
          .map((_, i) => i)
          .filter((i) => p.field[i].card && p.field[i].card !== io.ctx.card)
          .map((i) => slotOption(io.s, io.ctx.owner, i, io.ctx.owner)),
      ),
    )
    const card = cardFromId(
      io.pick(
        io.ctx.owner,
        'Choose the Support card that takes its place (it is Ready).',
        p.support.filter((c) => !io.reserved.includes(c)).map((c) => cardOption(io.s, c)),
      ),
    )
    return [slot, card]
  },
  apply(d, ctx, [slot, card]) {
    const p = d.players[ctx.owner]
    log(
      d,
      `${cardName(d, ctx.card)}: ${p.name} swaps the card at ${slotName(slot)} with a card from their Support.`,
    )
    swapIn(d, ctx.owner, slot, card, true)
  },
}

/**
 * Swap the position of a [word] card on your field with another card on your
 * field. `self`: the card may move itself ("this card included"). `showDown`: a
 * face-down [word] card may be chosen by showing it to the opponent; it stays
 * face down.
 */
export function maneuver(
  word: string,
  { self, showDown }: { self: boolean; showDown: boolean },
): Ability<[number, number]> {
  return {
    name: `Swap a ${word} card with another of your field cards`,
    plan(io) {
      const own = io.ctx.owner
      const field = io.s.players[own].field
      const a = slotFromId(
        io.pick(
          own,
          `Choose a ${word} card on your field.`,
          field
            .map((_, i) => i)
            .filter(
              (i) =>
                field[i].card &&
                (self || field[i].card !== io.ctx.card) &&
                (showDown || field[i].faceUp) &&
                inArchetype(io.s, field[i].card!, word),
            )
            .map((i) => slotOption(io.s, own, i, own)),
        ),
      )
      const b = slotFromId(
        io.pick(
          own,
          'Choose the card it swaps places with.',
          field
            .map((_, i) => i)
            .filter((i) => i !== a && field[i].card)
            .map((i) => slotOption(io.s, own, i, own)),
        ),
      )
      return [a, b]
    },
    apply(d, ctx, [a, b]) {
      const p = d.players[ctx.owner]
      const moved = p.field[a]
      if (!moved.faceUp)
        log(
          d,
          `${p.name} shows the face-down ${cardName(d, moved.card)} at ${slotName(a)}, a ${word} card; it stays face down.`,
        )
      log(
        d,
        `${cardName(d, ctx.card)}: ${p.name}'s ${slotName(a)} and ${slotName(b)} cards swap places.`,
      )
      swapSlots(d, { seat: ctx.owner, slot: a }, { seat: ctx.owner, slot: b })
    },
  }
}

/** Swap a ready card's position with another ready card on your field. */
export const readySwap: Ability<[number, number]> = {
  name: 'Swap two ready cards on your field',
  plan(io) {
    const own = io.ctx.owner
    const field = io.s.players[own].field
    const ready = (except: number) =>
      field
        .map((_, i) => i)
        .filter((i) => i !== except && field[i].card && field[i].state === 'ready')
        .map((i) => slotOption(io.s, own, i, own))
    const a = slotFromId(io.pick(own, 'Choose a ready card on your field.', ready(-1)))
    const b = slotFromId(io.pick(own, 'Choose the ready card it swaps places with.', ready(a)))
    return [a, b]
  },
  apply(d, ctx, [a, b]) {
    log(
      d,
      `${cardName(d, ctx.card)}: ${d.players[ctx.owner].name}'s ${slotName(a)} and ${slotName(b)} cards swap places.`,
    )
    swapSlots(d, { seat: ctx.owner, slot: a }, { seat: ctx.owner, slot: b })
  },
}

/**
 * A Support card swaps its position with a card on your field: each goes where
 * the other was (the field card to Support). `inherit`: it takes that card's state.
 */
export function swapInSelf(readyOnly: boolean, inherit: boolean): Ability<{ slot: number }> {
  return {
    name: 'Take the place of a card on your field',
    plan(io) {
      const own = io.ctx.owner
      const field = io.s.players[own].field
      const slot = slotFromId(
        io.pick(
          own,
          `Choose the card on your field that ${cardName(io.s, io.ctx.card)} replaces.`,
          field
            .map((_, i) => i)
            .filter((i) => field[i].card && (!readyOnly || field[i].state === 'ready'))
            .map((i) => slotOption(io.s, own, i, own)),
        ),
      )
      return { slot }
    },
    apply(d, ctx, { slot }) {
      log(
        d,
        `${cardName(d, ctx.card)} takes the place of the card at ${slotName(slot)}, which goes to Support.`,
      )
      swapIn(d, ctx.owner, slot, ctx.card, !inherit)
    },
  }
}

/**
 * A Fighting Spirit card swaps its position with a card on your field: it takes
 * that card's place, and the field card takes its place as the Fighting Spirit.
 */
export function decoy(readyOnly: boolean): Ability<number> {
  return {
    name: `Swap with a ${readyOnly ? 'ready ' : ''}card on your field`,
    plan(io) {
      const own = io.ctx.owner
      const field = io.s.players[own].field
      return slotFromId(
        io.pick(
          own,
          `Choose a ${readyOnly ? 'ready ' : ''}card on your field: it becomes your Fighting Spirit and ${cardName(io.s, io.ctx.card)} takes its place.`,
          field
            .map((_, i) => i)
            .filter((i) => field[i].card && (!readyOnly || field[i].state === 'ready'))
            .map((i) => slotOption(io.s, own, i, own)),
        ),
      )
    },
    apply(d, ctx, slot) {
      const p = d.players[ctx.owner]
      const e = d.engagement
      const old = p.field[slot]
      if (!e || !old.card) return
      const entry = e.fs[ctx.owner].find((x) => x.card === ctx.card)
      const swapped = old.card
      if (entry) {
        entry.card = swapped
        entry.value = d.cards[swapped]?.fs ?? 0
        entry.from = 'field'
      }
      p.spent.splice(p.spent.indexOf(ctx.card), 1, swapped)
      p.field[slot] = { card: ctx.card, faceUp: old.faceUp, state: 'ready' }
      log(
        d,
        `${cardName(d, ctx.card)} takes the place of ${cardName(d, swapped)}, which becomes the Fighting Spirit (+${entry?.value ?? 0}).`,
      )
    },
  }
}

/**
 * Swap one of your attackers with one of your defenders: each takes the other's
 * role. The combat rules then count the new sides (and a new Main Attacker).
 */
export const switchSides: Ability<{ atk: number; def: number }> = {
  name: 'Switch an attacker and a defender',
  plan(io) {
    const own = io.ctx.owner
    const field = io.s.players[own].field
    const with_ = (state: string) =>
      field
        .map((_, i) => i)
        .filter((i) => field[i].card && field[i].state === state)
        .map((i) => slotOption(io.s, own, i, own))
    const atk = slotFromId(
      io.pick(own, 'Choose an attacker to become a defender.', with_('attacking')),
    )
    const def = slotFromId(
      io.pick(own, 'Choose a defender to become an attacker.', with_('defending')),
    )
    return { atk, def }
  },
  apply(d, ctx, { atk, def }) {
    const p = d.players[ctx.owner]
    p.field[atk].state = 'defending'
    p.field[def].state = 'attacking'
    log(
      d,
      `${cardName(d, ctx.card)}: ${cardName(d, p.field[atk].card)} now defends and ${cardName(d, p.field[def].card)} attacks.`,
    )
    if (p.mainAttacker === atk) {
      p.mainAttacker = def
      log(d, `${cardName(d, p.field[def].card)} is ${p.name}'s new Main Attacker.`)
    }
  },
}

/** Turn an opponent's field card to the ability-active position without resolving its ability. */
export function lockOpponent(readyOnly: boolean): Ability<number> {
  return {
    name: "Turn an opponent's card ability-active",
    plan(io) {
      const opp = other(io.ctx.owner)
      const field = io.s.players[opp].field
      return slotFromId(
        io.pick(
          io.ctx.owner,
          `Choose the opponent's ${readyOnly ? 'ready ' : ''}card to turn ability-active.`,
          field
            .map((_, i) => i)
            .filter(
              (i) =>
                field[i].card &&
                field[i].state !== 'ability' &&
                (!readyOnly || field[i].state === 'ready') &&
                touchable(io.s, io.ctx, opp, i, { target: true }),
            )
            .map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
        ),
      )
    },
    apply(d, ctx, slot) {
      const opp = other(ctx.owner)
      const f = d.players[opp].field[slot]
      log(
        d,
        `${cardName(d, ctx.card)}: ${d.players[opp].name}'s ${f.faceUp ? cardName(d, f.card) : 'face-down card'} at ${slotName(slot)} turns ability-active.`,
      )
      f.state = 'ability'
    },
  }
}

export const attackUnbound: Ability<null> = {
  name: 'Attack Unbound this round',
  plan: () => null,
  apply(d, ctx) {
    d.players[ctx.owner].round.attackUnbound = true
    log(
      d,
      `${cardName(d, ctx.card)}: Attack Unbound. All of ${d.players[ctx.owner].name}'s attackers count this round.`,
    )
  },
}

/** Your opponent reveals a random card from their Support to you. */
export const seeSupport: Ability<null> = {
  name: "See a random card from the opponent's Support",
  can: (s, ctx) => s.players[other(ctx.owner)].support.length > 0,
  plan: () => null,
  apply(d, ctx) {
    const opp = d.players[other(ctx.owner)]
    const card = opp.support[rand(d, opp.support.length)]
    log(d, `${cardName(d, ctx.card)}: ${opp.name} reveals ${cardName(d, card)} from their Support.`)
  },
}

/** This card is included in your attacking group this round, whatever its Fate Number. */
export const joinAttackers: Ability<null> = {
  name: 'Joins the attackers this round',
  plan: () => null,
  apply(d, ctx) {
    d.players[ctx.owner].round.extra.push(ctx.card)
    log(d, `${cardName(d, ctx.card)} will attack this round, whatever its Fate Number.`)
  },
}

/** Return a [word] card (any card when `word` is null) from your rest zone to your Support. */
export function returnFromRest(word: string | null): Ability<string> {
  const what = word ? `a ${word} card` : 'a card'
  return {
    name: `Return ${what} from your rest zone to Support`,
    plan(io) {
      const own = io.ctx.owner
      return cardFromId(
        io.pick(
          own,
          `Choose ${what} in your rest zone to return to your Support.`,
          io.s.players[own].rest
            .filter((c) => c !== io.ctx.card && (!word || inArchetype(io.s, c, word)))
            .map((c) => cardOption(io.s, c)),
        ),
      )
    },
    apply(d, ctx, card) {
      const p = d.players[ctx.owner]
      p.rest.splice(p.rest.indexOf(card), 1)
      p.support.push(card)
      log(
        d,
        `${cardName(d, ctx.card)}: ${cardName(d, card)} returns from the rest zone to ${p.name}'s Support.`,
      )
    },
  }
}

/** Target player rests a card from their Support (they choose the card). */
export const playerRests: Ability<{ seat: Seat; card: string }> = {
  name: 'A player rests a Support card',
  can: (s) => s.players.some((p) => p.support.length > 0),
  plan(io) {
    const own = io.ctx.owner
    const seats = ([own, other(own)] as Seat[]).filter((x) => io.s.players[x].support.length)
    const seat = Number(
      io
        .pick(
          own,
          'Choose the player who rests a card from their Support.',
          seats.map((x) => ({ id: `seat:${x}`, label: x === own ? 'You' : io.s.players[x].name })),
        )
        .slice(5),
    ) as Seat
    const card = cardFromId(
      io.pick(
        seat,
        'choose a card from your Support to rest.',
        io.s.players[seat].support.map((c) => cardOption(io.s, c)),
      ),
    )
    return { seat, card }
  },
  apply(d, _ctx, { seat, card }) {
    log(d, `${d.players[seat].name} rests ${cardName(d, card)} from their Support.`)
    rest(d, seat, card)
  },
}

/** A field card swaps its own position with another card on your field. */
export function selfSwap(readyOnly: boolean): Ability<number> {
  return {
    name: `Swap with ${readyOnly ? 'a ready' : 'another'} card on your field`,
    plan(io) {
      const own = io.ctx.owner
      const field = io.s.players[own].field
      return slotFromId(
        io.pick(
          own,
          `Choose the card ${cardName(io.s, io.ctx.card)} swaps places with.`,
          field
            .map((_, i) => i)
            .filter(
              (i) =>
                field[i].card &&
                field[i].card !== io.ctx.card &&
                (!readyOnly || field[i].state === 'ready'),
            )
            .map((i) => slotOption(io.s, own, i, own)),
        ),
      )
    },
    apply(d, ctx, slot) {
      const p = d.players[ctx.owner]
      const self = p.field.findIndex((f) => f.card === ctx.card)
      if (self < 0) return
      log(
        d,
        `${cardName(d, ctx.card)}: ${p.name}'s ${slotName(self)} and ${slotName(slot)} cards swap places.`,
      )
      swapSlots(d, { seat: ctx.owner, slot: self }, { seat: ctx.owner, slot })
    },
  }
}

/** Non-adjacent cards (or only [word] cards) are counted for attack or defense this round. */
export function unboundFor(side: 'attack' | 'defense', word: string | null): Ability<null> {
  if (side === 'attack' && !word) return attackUnbound
  const what = word ? `${word} cards` : 'cards'
  return {
    name: `Non-adjacent ${what} count for ${side} this round`,
    plan: () => null,
    apply(d, ctx) {
      const r = d.players[ctx.owner].round
      r.unbound = [...(r.unbound ?? []), word ? { side, word } : { side }]
      log(
        d,
        `${cardName(d, ctx.card)}: all of ${d.players[ctx.owner].name}'s ${word ? `${word} ` : ''}${side === 'attack' ? 'attackers' : 'defenders'} count this round.`,
      )
    },
  }
}

/** Copy and use the Field Ability of a face-up card on the opponent's field (not one that copies). */
export const copyAbility: Ability<{ source: string; sub: unknown }> = {
  name: "Copy an opponent's Field Ability",
  plan(io: PlanIO) {
    const opp = other(io.ctx.owner)
    const source = cardFromId(
      io.pick(
        io.ctx.owner,
        "Choose the opponent's card whose Field Ability to copy.",
        faceUp(io.s, opp)
          .filter((x) => {
            const r = rulesOf(io.s, x.card)
            return r?.field && !r.copies && (!r.field.can || r.field.can(io.s, io.ctx))
          })
          .map((x) => ({ ...slotOption(io.s, opp, x.slot, io.ctx.owner), id: `card:${x.card}` })),
      ),
    )
    const sub = rulesOf(io.s, source)!.field!.plan(io)
    return { source, sub }
  },
  apply(d, ctx, { source, sub }) {
    log(d, `${cardName(d, ctx.card)} copies ${cardName(d, source)}'s Field Ability.`)
    rulesOf(d, source)!.field!.apply(d, ctx, sub)
  },
}

// ---- Ways an ability is used ----

/** "Rest N:": the owner rests N Support cards to use the ability. */
export function withCost<P>(ab: Ability<P>, n: number): Ability<{ pay: string[]; sub: P }> {
  return {
    ...ab,
    name: `Rest ${n}: ${ab.name}`,
    plan(io) {
      const pay = restCost(io, n)
      return { pay, sub: ab.plan(io) }
    },
    apply(d, ctx, { pay, sub }) {
      payCost(d, ctx, pay)
      ab.apply(d, ctx, sub)
    },
  }
}

/** "Once per round:". */
export function oncePerRound<P>(ab: Ability<P>): Ability<P> {
  return {
    ...ab,
    can: (s, ctx) =>
      !s.players[ctx.owner].round.used.includes(ctx.card) && (!ab.can || ab.can(s, ctx)),
    apply(d, ctx, plan) {
      ab.apply(d, ctx, plan)
      d.players[ctx.owner].round.used.push(ctx.card)
    },
  }
}

/** Only when a condition holds (e.g. "Defending Side:"). */
export function when<P>(ab: Ability<P>, cond: (s: AsState, ctx: Ctx) => boolean): Ability<P> {
  return { ...ab, can: (s, ctx) => cond(s, ctx) && (!ab.can || ab.can(s, ctx)) }
}

function payCost(d: D, ctx: Ctx, cards: string[]) {
  if (!cards.length) return
  log(
    d,
    `${d.players[ctx.owner].name} rests ${cards.map((c) => cardName(d, c)).join(', ')} to pay the cost.`,
  )
  for (const c of cards) rest(d, ctx.owner, c)
}

/** The card the ability swaps out is rested too. */
export const swapOutAndRest: Ability<number> = {
  ...opponentSwapOut,
  name: "Swap an opponent's ready card with a random Support card (it is rested)",
  apply(d, ctx, slot) {
    const opp = other(ctx.owner)
    const old = d.players[opp].field[slot].card
    opponentSwapOut.apply(d, ctx, slot)
    if (old && d.players[opp].support.includes(old)) {
      log(d, `${cardName(d, ctx.card)}: the card swapped out is rested.`)
      rest(d, opp, old)
    }
  },
}

/**
 * Field Lockout (Unmade Wretch): an opponent's field card is turned face down
 * and to the ability-active position for the round. It can't attack, defend or
 * use abilities, and it can't be revealed again until Regroup.
 */
export const sealOpponent: Ability<number> = {
  name: "Turn an opponent's card face down for the round",
  plan(io) {
    const opp = other(io.ctx.owner)
    const field = io.s.players[opp].field
    const sealed = io.s.players[opp].round.sealed ?? []
    return slotFromId(
      io.pick(
        io.ctx.owner,
        "Choose the opponent's card to turn face down for the round.",
        field
          .map((_, i) => i)
          .filter(
            (i) =>
              field[i].card &&
              !sealed.includes(field[i].card!) &&
              touchable(io.s, io.ctx, opp, i, { target: true }),
          )
          .map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
      ),
    )
  },
  apply(d, ctx, slot) {
    const p = d.players[other(ctx.owner)]
    const f = p.field[slot]
    log(
      d,
      `${cardName(d, ctx.card)}: ${p.name}'s ${f.faceUp ? cardName(d, f.card) : 'face-down card'} at ${slotName(slot)} is turned face down: it can't attack, defend or use abilities this round.`,
    )
    f.faceUp = false
    f.state = 'ability'
    p.round.sealed = [...(p.round.sealed ?? []), f.card!]
  },
}

/**
 * Rest Zone Lockout (Kobold Grave-Robber, Kobold Trapsetter): a card in the
 * opponent's rest zone is turned face down. It can't be used for a Rest
 * Ability (`rest`) or to refill the field (`refill`) while it stays there.
 */
export function lockRestZone(kind: 'rest' | 'refill'): Ability<string> {
  const free = (s: AsState, seat: Seat) =>
    s.players[seat].rest.filter((c) => !isLocked(s, seat, c, kind))
  return {
    name:
      kind === 'rest'
        ? "Lock a card in the opponent's rest zone (no Rest Ability)"
        : "Lock a card in the opponent's rest zone (no refilling the field)",
    can: (s, ctx) => free(s, other(ctx.owner)).length > 0,
    plan(io) {
      const opp = other(io.ctx.owner)
      return cardFromId(
        io.pick(
          io.ctx.owner,
          "Choose a card in the opponent's rest zone to turn face down.",
          free(io.s, opp).map((c) => cardOption(io.s, c)),
        ),
      )
    },
    apply(d, ctx, card) {
      const p = d.players[other(ctx.owner)]
      p.locked = [...(p.locked ?? []), { card, kind }]
      log(
        d,
        `${cardName(d, ctx.card)}: ${p.name}'s ${cardName(d, card)} is turned face down in the rest zone: ${kind === 'rest' ? "it can't be used for a Rest Ability" : "it can't refill the field"} while it stays there.`,
      )
    },
  }
}
