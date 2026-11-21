import { slotName } from '../board'
import { cardName, other, type AsState, type Seat } from '../state'
import { lockCombat } from '../stats'
import {
  cardFromId,
  cardOption,
  faceUp,
  inArchetype,
  log,
  rand,
  rest,
  restImmune,
  slotFromId,
  slotOption,
  swapIn,
  swapSlots,
  toSupport,
  touchable,
} from './helpers'
import { rulesOf } from './registry'
import type { Ability, Ctx, D } from './types'

/**
 * Abilities of The First Quest (engine-rules.md): blind random rests, face-down
 * turns, the Field ability replacement and the Fighting Spirit turn rules.
 */

/** Opponent rests a random card from their Support (picked blind). */
export const opponentRandomRests: Ability<null> = {
  name: 'Opponent rests a random Support card',
  plan: () => null,
  apply(d, ctx) {
    const opp = other(ctx.owner)
    const sup = d.players[opp].support
    if (!sup.length) return log(d, `${d.players[opp].name} has no Support card to rest.`)
    if (restImmune(d, opp))
      return log(d, `${d.players[opp].name} can't be forced to rest cards.`)
    const card = sup[rand(d, sup.length)]
    log(d, `${cardName(d, ctx.card)}: ${d.players[opp].name} rests a random Support card (${cardName(d, card)}).`)
    rest(d, opp, card)
  },
}

/** Can this card be turned face down (Trusted Shield Bearer protects "Kingdom's" cards)? */
function canTurnDown(s: AsState, seat: Seat, card: string) {
  return !faceUp(s, seat).some((x) => {
    const g = rulesOf(s, x.card)?.downProof
    return !!g && g.test(s, seat, x.card) && inArchetype(s, card, g.word)
  })
}

/** Turn target (Ready / Ace / any) card on the opponent's field face down for the round. */
export function turnDown(which: 'any' | 'ready' | 'ace'): Ability<number> {
  return {
    name: `Turn ${which === 'ace' ? 'an opposing Ace' : which === 'ready' ? "an opponent's Ready card" : "an opponent's card"} face down`,
    plan(io) {
      const opp = other(io.ctx.owner)
      const field = io.s.players[opp].field
      return slotFromId(
        io.pick(
          io.ctx.owner,
          "Choose the opponent's card to turn face down.",
          field
            .map((_, i) => i)
            .filter((i) => {
              const f = field[i]
              if (!f.card || !f.faceUp) return false
              if (which === 'ready' && f.state !== 'ready') return false
              if (which === 'ace' && !io.s.cards[f.card]?.ace) return false
              return (
                canTurnDown(io.s, opp, f.card) && touchable(io.s, io.ctx, opp, i, { target: true })
              )
            })
            .map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
        ),
      )
    },
    apply(d, ctx, slot) {
      const p = d.players[other(ctx.owner)]
      const f = p.field[slot]
      log(d, `${cardName(d, ctx.card)}: ${p.name}'s ${cardName(d, f.card)} (${slotName(slot)}) is turned face down.`)
      f.faceUp = false
      f.state = 'ability'
      p.round.sealed = [...(p.round.sealed ?? []), f.card!]
      // It leaves the attack or defense.
      if (d.combat)
        for (const st of d.combat.stacks)
          if (st) {
            st.attack = st.attack.filter((c) => c !== f.card)
            st.defense = st.defense.filter((c) => c !== f.card)
          }
    },
  }
}

/** Rest target Ace on the opponent's field (Unassuming Mage). */
export const restAce: Ability<number> = {
  name: "Rest an opponent's Ace",
  can: (s, ctx) => faceUp(s, other(ctx.owner)).some((x) => s.cards[x.card]?.ace),
  plan(io) {
    const opp = other(io.ctx.owner)
    const field = io.s.players[opp].field
    return slotFromId(
      io.pick(
        io.ctx.owner,
        "Choose the opponent's Ace to rest.",
        field
          .map((_, i) => i)
          .filter(
            (i) =>
              !!field[i].card &&
              field[i].faceUp &&
              !!io.s.cards[field[i].card!]?.ace &&
              touchable(io.s, io.ctx, opp, i, { target: true, move: true }),
          )
          .map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
      ),
    )
  },
  apply(d, ctx, slot) {
    const opp = other(ctx.owner)
    const card = d.players[opp].field[slot].card
    if (!card) return
    log(d, `${cardName(d, ctx.card)}: ${cardName(d, card)} is rested.`)
    rest(d, opp, card)
  },
}

/** Swap the positions of two cards on your field (any cards). */
export const swapTwoAny: Ability<[number, number]> = {
  name: 'Swap two cards on your field',
  can: (s, ctx) => s.players[ctx.owner].field.filter((f) => f.card).length >= 2,
  plan(io) {
    const own = io.ctx.owner
    const list = io.s.players[own].field.flatMap((f, i) => (f.card ? [i] : []))
    const a = slotFromId(
      io.pick(own, 'Choose a card on your field to move.', list.map((i) => slotOption(io.s, own, i, own))),
    )
    const b = slotFromId(
      io.pick(
        own,
        'Choose the card it swaps places with.',
        list.filter((i) => i !== a).map((i) => slotOption(io.s, own, i, own)),
      ),
    )
    return [a, b]
  },
  apply(d, ctx, [a, b]) {
    log(d, `${cardName(d, ctx.card)}: ${d.players[ctx.owner].name}'s ${slotName(a)} and ${slotName(b)} cards swap places.`)
    swapSlots(d, { seat: ctx.owner, slot: a }, { seat: ctx.owner, slot: b })
  },
}

/** Rest up to N [word] cards from your Support (Grave Digger). */
export function restArch(n: number, word: string): Ability<string[]> {
  const list = (s: AsState, ctx: Ctx, skip: string[]) =>
    s.players[ctx.owner].support.filter((c) => c !== ctx.card && !skip.includes(c) && inArchetype(s, c, word))
  return {
    name: `Rest up to ${n} ${word} cards from your Support`,
    plan(io) {
      const out: string[] = []
      for (let k = 0; k < n; k++) {
        const left = list(io.s, io.ctx, [...io.reserved, ...out])
        if (!left.length) break
        const id = io.pick(io.ctx.owner, `Choose a ${word} card to rest (or stop).`, [
          ...left.map((c) => cardOption(io.s, c)),
          { id: 'done', label: 'Done' },
        ])
        if (id === 'done') break
        out.push(cardFromId(id))
      }
      return out
    },
    apply(d, ctx, cards) {
      for (const c of cards)
        if (d.players[ctx.owner].support.includes(c)) {
          log(d, `${cardName(d, ctx.card)}: ${d.players[ctx.owner].name} rests ${cardName(d, c)}.`)
          rest(d, ctx.owner, c)
        }
    },
  }
}

/** Put the top (newest) card of your rest zone into your Support (Lucky Charm Bearer). */
export const topRestToSupport: Ability<null> = {
  name: 'Put the top card of your rest zone into your Support',
  can: (s, ctx) => s.players[ctx.owner].rest.length > 0,
  plan: () => null,
  apply(d, ctx) {
    const p = d.players[ctx.owner]
    const card = p.rest.at(-1)
    if (!card) return
    p.rest.pop()
    p.support.push(card)
    log(d, `${cardName(d, ctx.card)}: ${cardName(d, card)} goes from the rest zone to ${p.name}'s Support.`)
  },
}

/** Opponent swaps one of their attackers with one of their defenders (they choose). */
export const opponentSwitchesSides: Ability<{ atk: string; def: string } | null> = {
  name: 'Opponent swaps an attacker with a defender',
  plan(io) {
    const opp = other(io.ctx.owner)
    const lock = io.s.combat ?? lockCombat(io.s)
    const field = io.s.players[opp].field
    const atkList = lock.stacks[opp]?.attack ?? []
    const defList = lock.stacks[io.ctx.owner]?.defense ?? []
    if (!atkList.length || !defList.length) return null
    const opts = (cards: string[]) =>
      cards.flatMap((c) => {
        const i = field.findIndex((f) => f.card === c)
        return i >= 0 ? [slotOption(io.s, opp, i, opp)] : []
      })
    const card = (id: string) => field[slotFromId(id)].card!
    const atk = card(io.pick(opp, 'choose one of your attackers to become a defender.', opts(atkList)))
    const def = card(io.pick(opp, 'choose one of your defenders to become an attacker.', opts(defList)))
    return { atk, def }
  },
  apply(d, ctx, p) {
    if (!p) return log(d, 'Nothing to swap.')
    const opp = other(ctx.owner)
    d.combat ??= lockCombat(d)
    const attack = d.combat.stacks[opp]
    const defense = d.combat.stacks[ctx.owner]
    if (attack) attack.attack = attack.attack.map((c) => (c === p.atk ? p.def : c))
    if (defense) defense.defense = defense.defense.map((c) => (c === p.def ? p.atk : c))
    for (const f of d.players[opp].field) {
      if (f.card === p.atk) f.state = 'defending'
      else if (f.card === p.def) f.state = 'attacking'
    }
    log(d, `${cardName(d, ctx.card)}: ${cardName(d, p.atk)} joins the defense and ${cardName(d, p.def)} joins the attack.`)
  },
}

/** Ghoulish Brute: the opponent must pass after their next reveal. */
export const forcePass: Ability<null> = {
  name: 'Opponent must pass after their next reveal',
  can: (s) => !!s.engagement,
  plan: () => null,
  apply(d, ctx) {
    const e = d.engagement
    if (!e) return
    e.passAfter = other(ctx.owner)
    log(d, `${cardName(d, ctx.card)}: ${d.players[other(ctx.owner)].name} must pass after their next reveal.`)
  },
}

/** The Kingdom's Archmage: the opponent can't pass, and their next reveal is 2 cards. */
export const doubleReveal: Ability<null> = {
  name: "Opponent can't pass; their next reveal is 2 cards",
  can: (s) => !!s.engagement,
  plan: () => null,
  apply(d, ctx) {
    const e = d.engagement
    if (!e) return
    e.mustReveal = other(ctx.owner)
    delete e.twoLeft
    log(d, `${cardName(d, ctx.card)}: ${d.players[other(ctx.owner)].name} can't pass and reveals 2 cards next.`)
  },
}

/** After its Rest ability, the card is turned face down in the rest zone until Regroup. */
export function thenLockSelf<P>(ab: Ability<P>): Ability<P> {
  return {
    ...ab,
    apply(d, ctx, p) {
      ab.apply(d, ctx, p)
      const own = d.players[ctx.owner]
      if (own.rest.includes(ctx.card)) {
        own.locked = [...(own.locked ?? []), { card: ctx.card, kind: 'rest' }]
        log(d, `${cardName(d, ctx.card)} is turned face down in the rest zone until Regroup.`)
      }
    },
  }
}

/**
 * The Field ability replacement (Open Skirmish): the used card goes to the
 * rest zone (Unassuming Mage: to Support) and the owner chooses a Support card
 * to take its position, face up and Ready.
 */
export const replaceSelf: Ability<string> = {
  name: 'Replace the used card from Support',
  can: (s, ctx) =>
    s.players[ctx.owner].field.some((f) => f.card === ctx.card) && s.players[ctx.owner].support.length > 0,
  plan(io) {
    return cardFromId(
      io.pick(
        io.ctx.owner,
        `Choose the Support card that replaces ${cardName(io.s, io.ctx.card)} (Ready).`,
        io.s.players[io.ctx.owner].support.map((c) => cardOption(io.s, c)),
      ),
    )
  },
  apply(d: D, ctx, card) {
    const p = d.players[ctx.owner]
    const slot = p.field.findIndex((f) => f.card === ctx.card)
    if (slot < 0) return
    const self = ctx.card
    swapIn(d, ctx.owner, slot, card, true)
    p.field[slot].faceUp = true
    const toSup = rulesOf(d, self)?.toSupport
    log(d, `${cardName(d, card)} takes the place of ${cardName(d, self)}, which goes to ${toSup ? 'Support' : 'the rest zone'}.`)
    if (toSup) toSupport(d, ctx.owner, self)
    else rest(d, ctx.owner, self)
  },
}
