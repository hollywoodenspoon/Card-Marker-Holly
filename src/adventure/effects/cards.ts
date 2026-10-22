import { slotName } from '../board'
import { cardName, other, type AsState, type Seat } from '../state'
import {
  archInRest,
  archOnField,
  cardFromId,
  cardOption,
  faceUp,
  isCenterSlot,
  log,
  nameHas,
  opponentRestsApply,
  opponentRestsPlan,
  rand,
  restCost,
  rest,
  restCount,
  slotFromId,
  slotOption,
  swapIn,
  swapSlots,
  touchable,
} from './helpers'
import type { Ability, CardRules, Ctx, D, PlanIO } from './types'

/**
 * Every First Quest card's ability, by card code, as the owner settled them
 * (see the v2 rulebook and DECISIONS.md). Abilities are written from the
 * owner's side (`ctx.owner`), so a copied ability works for whoever copies it.
 */

// ---- Small building blocks ----

const initiative = (s: AsState, seat: Seat) => s.initiative === seat
/** Engagements fought this round (not counting a player who had no attacker). */
const fought = (s: AsState) => s.results.filter((r) => r.note !== 'no-attacker')
const secondEngagement = (s: AsState) => !!s.engagement && fought(s).length === 1

const opponentRests: Ability<string | null> = {
  name: 'Opponent rests a Support card',
  plan: opponentRestsPlan,
  apply: opponentRestsApply,
}

/** Swap target opponent's card's position with another card on their field. */
function opponentPositionSwap(): Ability<[number, number]> {
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
const opponentSwapOut: Ability<number> = {
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
const ownSwapIn: Ability<[number, string]> = {
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
 * Maneuver: swap the position of a [word] card on your field with another card
 * on your field. The card may move itself (owner's ruling). A face-down [word]
 * card may be chosen by showing it to the opponent; it stays face down.
 */
function maneuver(word: string): Ability<[number, number]> {
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
            .filter((i) => field[i].card && nameHas(io.s, field[i].card!, word))
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

/** Turn an opponent's field card to the ability-active position without resolving its ability. */
function lockOpponent(cost: number, readyOnly: boolean): Ability<{ cost: string[]; slot: number }> {
  return {
    name: `${cost ? `Rest ${cost}: ` : ''}Turn an opponent's card ability-active`,
    plan(io) {
      const opp = other(io.ctx.owner)
      const pay = restCost(io, cost)
      const field = io.s.players[opp].field
      const slot = slotFromId(
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
      return { cost: pay, slot }
    },
    apply(d, ctx, { cost: pay, slot }) {
      const opp = other(ctx.owner)
      payCost(d, ctx, pay)
      const f = d.players[opp].field[slot]
      log(
        d,
        `${cardName(d, ctx.card)}: ${d.players[opp].name}'s ${f.faceUp ? cardName(d, f.card) : 'face-down card'} at ${slotName(slot)} turns ability-active.`,
      )
      f.state = 'ability'
    },
  }
}

function payCost(d: D, ctx: Ctx, cards: string[]) {
  if (!cards.length) return
  log(
    d,
    `${d.players[ctx.owner].name} rests ${cards.map((c) => cardName(d, c)).join(', ')} to pay the cost.`,
  )
  for (const c of cards) rest(d, ctx.owner, c)
}

/** A plain A/D bonus while a condition holds. */
const plus = (v: { a: number; d: number }, a: number, d: number) => ({ a: v.a + a, d: v.d + d })

const positional: CardRules['stat'] = (_s, _seat, slot, v) =>
  isCenterSlot(slot) ? plus(v, 0, 1) : plus(v, 1, 0)

/** Field (+1 A) and Fallen (+1 D) for an archetype word. */
const fieldAndFallen =
  (word: string): CardRules['stat'] =>
  (s, seat, slot, v) => {
    const self = s.players[seat].field[slot].card!
    return plus(
      v,
      archOnField(s, seat, word, self) ? 1 : 0,
      archInRest(s, seat, word, self) ? 1 : 0,
    )
  }

/** Return: you may use this rest-zone card for Fighting Spirit, +1 FS. */
const restFs = (
  can: (s: AsState, seat: Seat, card: string) => boolean,
  bonus = 1,
  coin = false,
) => ({
  can,
  bonus,
  coin,
})

// ---- The cards ----

export const CARD_RULES: Record<string, CardRules> = {
  // Crimson Duelist {ace}: may not be the target of an opponent's Field Ability.
  'TFQ-01': { fieldProof: true },
  // Spirited Knight: Attacking Side +1 FS. Initiative +1 FS.
  'TFQ-02': {
    fs: (s, seat, e, v) => v + (e.attacker === seat ? 1 : 0) + (initiative(s, seat) ? 1 : 0),
  },
  // Spiritforged Monk: Initiative +1 FS. Defending Side +1 FS.
  'TFQ-03': {
    fs: (s, seat, e, v) => v + (initiative(s, seat) ? 1 : 0) + (e.attacker !== seat ? 1 : 0),
  },
  // Strategic Vanguard: Defending Side: one attacker becomes a defender and one defender an attacker.
  'TFQ-04': {
    battle: {
      name: 'Switch an attacker and a defender',
      optional: true,
      can: (s, ctx) => !!s.engagement && s.engagement.attacker !== ctx.owner,
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
    } satisfies Ability<{ atk: number; def: number }>,
  },
  // Decoy Ninja: No-Initiative: swap with a ready card on your field (that card becomes the Fighting Spirit).
  'TFQ-05': {
    battle: {
      name: 'Swap with a ready card on your field',
      optional: true,
      can: (s, ctx) => !initiative(s, ctx.owner),
      plan(io) {
        const own = io.ctx.owner
        const field = io.s.players[own].field
        return slotFromId(
          io.pick(
            own,
            'Choose a ready card on your field: it becomes your Fighting Spirit and the Ninja takes its place.',
            field
              .map((_, i) => i)
              .filter((i) => field[i].card && field[i].state === 'ready')
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
    } satisfies Ability<number>,
  },
  // Vigilant Ranger: Flip: opponent rests a card from their Support.
  'TFQ-06': { flip: opponentRests },
  // Master Archer: Field: opponent rests a card from their Support.
  'TFQ-07': {
    field: { ...opponentRests, can: (s, ctx) => s.players[other(ctx.owner)].support.length > 0 },
  },
  // Spatial Witch: Field: swap target opponent's ready card with a random Support card.
  // Spatial Witch: Field: swap target opponent's ready card with a random Support card; the swapped-out card is rested.
  'TFQ-08': {
    field: {
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
    } satisfies Ability<number>,
  },
  // Guild Quarter Master: Field: swap a field card with a Support card (placed Ready).
  'TFQ-09': { field: ownSwapIn },
  // Haughty Knight: Flip: swap target opponent's card's position with another of theirs.
  'TFQ-10': { flip: opponentPositionSwap() },
  // Mission Handler: Support, once per round: swap two ready cards on your field; it isn't rested.
  'TFQ-11': {
    support: {
      name: 'Swap two ready cards on your field',
      can: (s, ctx) => !s.players[ctx.owner].round.used.includes(ctx.card),
      keep: () => true,
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
        return [a, b] as [number, number]
      },
      apply(d, ctx, [a, b]) {
        log(
          d,
          `${cardName(d, ctx.card)}: ${d.players[ctx.owner].name}'s ${slotName(a)} and ${slotName(b)} cards swap places.`,
        )
        swapSlots(d, { seat: ctx.owner, slot: a }, { seat: ctx.owner, slot: b })
        d.players[ctx.owner].round.used.push(ctx.card)
      },
    } satisfies Ability<[number, number]>,
  },
  // Hunter Dragoon: Support: an opponent's field card turns ability-active.
  'TFQ-12': { support: lockOpponent(0, false) },
  // Hero of Rianz {ace}: Field: Attack Unbound this round.
  'TFQ-13': {
    field: {
      name: 'Attack Unbound this round',
      plan: () => null,
      apply(d, ctx) {
        d.players[ctx.owner].round.attackUnbound = true
        log(
          d,
          `${cardName(d, ctx.card)}: Attack Unbound. All of ${d.players[ctx.owner].name}'s attackers count this round.`,
        )
      },
    },
  },
  // Barrier Wizard: Defending Side +1 FS. Initiative +1 FS.
  'TFQ-14': {
    fs: (s, seat, e, v) => v + (e.attacker !== seat ? 1 : 0) + (initiative(s, seat) ? 1 : 0),
  },
  // Saboteur Guard: Attacking Side: opponent rests a card from their Support, if able.
  'TFQ-15': {
    battle: {
      ...opponentRests,
      can: (s, ctx) => !!s.engagement && s.engagement.attacker === ctx.owner,
    },
  },
  // Azure Assassin: Flip: swap target opponent's ready card with a random Support card.
  'TFQ-16': { flip: opponentSwapOut },
  // Rianz Swindler: Field: swap target opponent's card's position with another of theirs.
  'TFQ-17': { field: opponentPositionSwap() },
  // Weapon Master: Center +1 D. Flank +1 A.
  'TFQ-18': { stat: positional },
  // Trusted Shield-Bearer: Flank +1 A. Center +1 D.
  'TFQ-19': { stat: positional },
  // Rianz Sentinel: Support, once per round: opponent reveals a random Support card to you.
  'TFQ-20': {
    support: {
      name: "See a random card from the opponent's Support",
      can: (s, ctx) =>
        !s.players[ctx.owner].round.used.includes(ctx.card) &&
        s.players[other(ctx.owner)].support.length > 0,
      plan: () => null,
      apply(d, ctx) {
        const opp = d.players[other(ctx.owner)]
        const card = opp.support[rand(d, opp.support.length)]
        d.players[ctx.owner].round.used.push(ctx.card)
        log(
          d,
          `${cardName(d, ctx.card)}: ${opp.name} reveals ${cardName(d, card)} from their Support.`,
        )
      },
      keep: () => true,
    },
  },
  // Light Dragoon: Support: takes the place of a field card (and its state); that card goes to Support.
  'TFQ-21': {
    support: {
      name: 'Take the place of a card on your field',
      plan(io) {
        const own = io.ctx.owner
        const field = io.s.players[own].field
        const slot = slotFromId(
          io.pick(
            own,
            'Choose the card on your field that Light Dragoon replaces.',
            field
              .map((_, i) => i)
              .filter((i) => field[i].card)
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
        swapIn(d, ctx.owner, slot, ctx.card, false)
      },
      keep: () => true,
    } satisfies Ability<{ slot: number }>,
  },
  // Ranger of the Tower: can't be repositioned by an opponent's ability.
  'TFQ-22': { fixed: true },
  // Rianz Emissary: Field +1 A, Fallen +1 D (Rianz).
  'TFQ-23': { stat: fieldAndFallen('Rianz') },
  // Howling Barbarian: Flip: joins your attackers this round, whatever its Fate Number.
  'TFQ-24': {
    flip: {
      name: 'Joins the attackers this round',
      plan: () => null,
      apply(d, ctx) {
        d.players[ctx.owner].round.extra.push(ctx.card)
        log(d, `${cardName(d, ctx.card)} will attack this round, whatever its Fate Number.`)
      },
    },
  },
  // Necromancer of Rotos {ace}: 3+ Rest Zone: Defense Unbound (while on your field).
  'TFQ-25': { defenseUnbound: (s, seat) => restCount(s, seat) >= 3 },
  // Grave Jackal: Initiative, 3+ Rest Zone: +1 FS. A Grave card on your field: +1 FS.
  'TFQ-26': {
    fs: (s, seat, _e, v) =>
      v +
      (initiative(s, seat) && restCount(s, seat) >= 3 ? 1 : 0) +
      (faceUp(s, seat).some((x) => nameHas(s, x.card, 'Grave')) ? 1 : 0),
  },
  // Grave Bloodsucker: No-Initiative, 3+ Rest Zone: +1 FS. A Grave card on your field: +1 FS.
  'TFQ-27': {
    fs: (s, seat, _e, v) =>
      v +
      (!initiative(s, seat) && restCount(s, seat) >= 3 ? 1 : 0) +
      (faceUp(s, seat).some((x) => nameHas(s, x.card, 'Grave')) ? 1 : 0),
  },
  // Grave Whisperer: Field +1 A, Fallen +1 D (Grave).
  'TFQ-28': { stat: fieldAndFallen('Grave') },
  // Grave Acolyte: Support: return a Grave card from your rest zone to your Support. Discount (Grave).
  'TFQ-29': {
    support: {
      name: 'Return a Grave card from your rest zone to Support',
      plan(io) {
        const own = io.ctx.owner
        return cardFromId(
          io.pick(
            own,
            'Choose a Grave card in your rest zone to return to your Support.',
            io.s.players[own].rest
              .filter((c) => c !== io.ctx.card && nameHas(io.s, c, 'Grave'))
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
      // Discount, checked after the card returned: another Grave card must still be resting.
      keep: (d, ctx) => archInRest(d, ctx.owner, 'Grave', ctx.card),
    } satisfies Ability<string>,
  },
  // Grave Reclaimer: Field, Maneuver (Grave).
  'TFQ-30': { field: maneuver('Grave') },
  // Grave Keeper: Field, Rest 1: an opponent's ready card turns ability-active.
  'TFQ-31': { field: lockOpponent(1, true) },
  // Ghoulish Assassin: Return (Ghoulish on your field): Fighting Spirit from the rest zone, +1 FS.
  'TFQ-32': { restFs: restFs((s, seat, c) => archOnField(s, seat, 'Ghoulish', c)) },
  // Ghoulish Mammoth: a Ghoulish card in your rest zone: Fighting Spirit from the rest zone, +1 FS.
  'TFQ-33': { restFs: restFs((s, seat, c) => archInRest(s, seat, 'Ghoulish', c)) },
  // Ghoulish Stalker: Strike (Ghoulish): +1 FS.
  'TFQ-34': {
    fs: (s, seat, e, v) => v + (e.fs[seat].some((x) => nameHas(s, x.card, 'Ghoulish')) ? 1 : 0),
  },
  // Undead Chimera: Won First Engagement: Fighting Spirit from the rest zone, +1 FS.
  'TFQ-35': {
    restFs: restFs((s, seat) => secondEngagement(s) && fought(s)[0].scorer === seat),
  },
  // Abominable Bishop: Lost Previous Engagement: Fighting Spirit from the rest zone, +1 FS.
  'TFQ-36': {
    restFs: restFs((s, seat) => secondEngagement(s) && fought(s)[0].scorer === other(seat)),
  },
  // Unassuming Mage {ace}: if the opponent has an Ace on their field: +3 A and +3 D.
  'TFQ-37': {
    stat: (s, seat, _slot, v) =>
      faceUp(s, other(seat)).some((x) => s.cards[x.card]?.ace) ? plus(v, 3, 3) : v,
  },
  // Coin-Toss Bravo: a coin when revealed: Heads 2 FS, Tails 0 FS.
  'TFQ-38': { fsCoin: { heads: 2, tails: 0 } },
  // Ghoulish Trickster: Flip, Maneuver (Ghoulish).
  'TFQ-39': { flip: maneuver('Ghoulish') },
  // Lucky Charm Bearer: 2 or more cards in your rest zone: +1 FS.
  'TFQ-40': { fs: (s, seat, _e, v) => v + (restCount(s, seat) >= 2 ? 1 : 0) },
  // Runaway Familiar: whenever it would be rested, it goes to your Support instead.
  'TFQ-41': { runaway: true },
  // Backwards Blade: 2+ Rest Zone: its A and D are swapped.
  'TFQ-42': {
    stat: (s, seat, _slot, v) => (restCount(s, seat) >= 2 ? { a: v.d, d: v.a } : v),
  },
  // Gambler's Gambit: Second Engagement: a coin; Heads: Fighting Spirit from the rest zone, +2 FS; Tails: the turn goes on.
  'TFQ-43': { restFs: restFs((s) => secondEngagement(s), 2, true) },
  // Doppelganger Thief: Field, Rest 2: copy and use the Field Ability of a face-up opponent card.
  'TFQ-44': { copies: true, field: copyAbility() },
  // Wildcard Wanderer: Flip: swap a field card with a Support card (placed Ready).
  'TFQ-45': { flip: ownSwapIn },
}

function copyAbility(): Ability<{ pay: string[]; source: string; sub: unknown }> {
  return {
    name: "Rest 2: copy an opponent's Field Ability",
    plan(io: PlanIO) {
      const opp = other(io.ctx.owner)
      const pay = restCost(io, 2)
      const source = cardFromId(
        io.pick(
          io.ctx.owner,
          "Choose the opponent's card whose Field Ability to copy.",
          faceUp(io.s, opp)
            .filter((x) => {
              const r = CARD_RULES[io.s.cards[x.card]?.code ?? '']
              return r?.field && !r.copies && (!r.field.can || r.field.can(io.s, io.ctx))
            })
            .map((x) => ({ ...slotOption(io.s, opp, x.slot, io.ctx.owner), id: `card:${x.card}` })),
        ),
      )
      const sub = CARD_RULES[io.s.cards[source].code].field!.plan(io)
      return { pay, source, sub }
    },
    apply(d, ctx, { pay, source, sub }) {
      payCost(d, ctx, pay)
      log(d, `${cardName(d, ctx.card)} copies ${cardName(d, source)}'s Field Ability.`)
      CARD_RULES[d.cards[source].code].field!.apply(d, ctx, sub)
    },
  }
}
