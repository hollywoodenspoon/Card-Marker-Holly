import { mirrored, slotName } from '../board'
import { cardName, other, type AsState, type Seat } from '../state'
import { statsAt } from '../stats'
import {
  cardFromId,
  cardOption,
  coin,
  inArchetype,
  isLocked,
  lift,
  log,
  rest,
  slotFromId,
  slotOf,
  slotOption,
  swapIn,
  swapSlots,
  touchable,
} from './helpers'
import { rulesOf } from './registry'
import type { Ability, Ctx, D, PlanIO } from './types'

/**
 * The abilities of the sets after The First Quest (Rulebook v2.6): debuff
 * tokens, Hire, coins, Interpose, Endure, Living Weapons and the swaps and
 * protections those decks use. Like `blocks.ts`, each is written from the
 * owner's side (`ctx.owner`).
 */

type Field = AsState['players'][number]['field']
const slots = (field: Field) => field.map((_, i) => i)

// ---- Combining abilities ----

/** Do `a`, then `b` too when its condition holds (Raven Matriarch's second sentence). */
export function andThen<A, B>(a: Ability<A>, b: Ability<B>): Ability<{ a: A; b: B | null }> {
  return {
    ...a,
    name: `${a.name}, then ${b.name.charAt(0).toLowerCase()}${b.name.slice(1)}`,
    plan(io) {
      const pa = a.plan(io)
      const pb = !b.can || b.can(io.s, io.ctx) ? b.plan(io) : null
      return { a: pa, b: pb }
    },
    apply(d, ctx, p) {
      a.apply(d, ctx, p.a)
      if (p.b !== null && (!b.can || b.can(d as AsState, ctx))) b.apply(d, ctx, p.b)
    },
  }
}

/** "Flip a coin": one flip, then the heads or the tails ability (either may be missing). */
export function coinFlip(
  heads: Ability | null,
  tails: Ability | null,
): Ability<{ heads: unknown; tails: unknown }> {
  const name = [heads && `Heads: ${heads.name}`, tails && `Tails: ${tails.name}`]
    .filter(Boolean)
    .join('. ')
  // The choices of both sides are asked first (the coin is flipped when it resolves).
  const plan = (ab: Ability | null, io: PlanIO) =>
    ab && (!ab.can || ab.can(io.s, io.ctx)) ? ab.plan(io) : undefined
  return {
    name: `Flip a coin. ${name}`,
    plan(io) {
      return { heads: plan(heads, io), tails: plan(tails, io) }
    },
    apply(d, ctx, p) {
      const h = coin(d)
      log(d, `${cardName(d, ctx.card)}: coin flip, ${h ? 'Heads' : 'Tails'}.`)
      const ab = h ? heads : tails
      const sub = h ? p.heads : p.tails
      if (ab && sub !== undefined) ab.apply(d, ctx, sub)
      else if (!ab) log(d, 'Nothing happens.')
    },
  }
}

/** "+N FS" as an ability (after a coin or a cost): the card's Fighting Spirit goes up by N. */
export function addFs(n: number): Ability<null> {
  return {
    name: `+${n} Fighting Spirit`,
    can: (s, ctx) => !!s.engagement?.fs[ctx.owner].some((x) => x.card === ctx.card),
    plan: () => null,
    apply(d, ctx) {
      const x = d.engagement?.fs[ctx.owner].find((f) => f.card === ctx.card)
      if (!x) return
      x.value += n
      log(d, `${cardName(d, ctx.card)}: +${n} Fighting Spirit.`)
    },
  }
}

// ---- Locks ----

export type LockTarget = 'any' | 'ready' | 'ace' | 'faceDownReady' | 'mirrored'

const LOCK_WORDS: Record<LockTarget, string> = {
  any: 'card',
  ready: 'ready card',
  ace: 'Ace',
  faceDownReady: 'face-down ready card',
  mirrored: 'ready card in the mirrored position',
}

/** Target an opponent's card (which kind, see `LockTarget`): it turns ability-active without resolving. */
export function lockWhere(which: LockTarget): Ability<number> {
  const fits = (s: AsState, ctx: Ctx, i: number) => {
    const opp = other(ctx.owner)
    const f = s.players[opp].field[i]
    if (!f.card || f.state === 'ability') return false
    if (which === 'ready' && f.state !== 'ready') return false
    if (which === 'ace' && !(f.faceUp && s.cards[f.card]?.ace)) return false
    if (which === 'faceDownReady' && (f.faceUp || f.state !== 'ready')) return false
    if (which === 'mirrored') {
      const self = slotOf(s, ctx.owner, ctx.card)
      if (self < 0 || i !== mirrored(self) || f.state !== 'ready') return false
    }
    return touchable(s, ctx, opp, i, { target: true })
  }
  return {
    name: `Turn an opponent's ${LOCK_WORDS[which]} ability-active`,
    can: (s, ctx) => slots(s.players[other(ctx.owner)].field).some((i) => fits(s, ctx, i)),
    plan(io) {
      const opp = other(io.ctx.owner)
      return slotFromId(
        io.pick(
          io.ctx.owner,
          `Choose the opponent's ${LOCK_WORDS[which]} to turn ability-active.`,
          slots(io.s.players[opp].field)
            .filter((i) => fits(io.s, io.ctx, i))
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

// ---- Debuff tokens ----

/** Put one debuff token on a field card, on Attack or Defense. During combat it lowers the locked value too. */
export function placeToken(d: D, seat: Seat, slot: number, stat: 'a' | 'd') {
  const f = d.players[seat].field[slot]
  if (!f.card) return
  f.tokens = { a: f.tokens?.a ?? 0, d: f.tokens?.d ?? 0 }
  f.tokens[stat]++
  const v = d.combat?.values[f.card]
  if (v) v[stat] = Math.max(0, v[stat] - 1)
}

export type TokenTarget = 'any' | 'defending' | 'highestAttack'

/**
 * Place a debuff token on `count` different cards on the opponent's field.
 * `stat` names the value it lowers; null: the placing player chooses for each.
 */
export function placeTokens(
  count: number,
  stat: 'a' | 'd' | null,
  which: TokenTarget,
): Ability<{ slot: number; stat: 'a' | 'd' }[]> {
  const fits = (s: AsState, ctx: Ctx, i: number) => {
    const opp = other(ctx.owner)
    const f = s.players[opp].field[i]
    if (!f.card || !touchable(s, ctx, opp, i, { target: true })) return false
    if (which === 'defending') return f.state === 'defending'
    if (which === 'highestAttack') {
      const top = Math.max(
        ...slots(s.players[opp].field)
          .filter((j) => s.players[opp].field[j].card)
          .map((j) => statsAt(s, opp, j).a),
      )
      return statsAt(s, opp, i).a === top
    }
    return true
  }
  const what = which === 'defending' ? 'defending card' : 'card'
  return {
    name:
      count > 1
        ? `Place a debuff token on ${count} opponent's cards`
        : `Place a debuff token on an opponent's ${which === 'highestAttack' ? 'highest-Attack card' : what}`,
    can: (s, ctx) => slots(s.players[other(ctx.owner)].field).some((i) => fits(s, ctx, i)),
    plan(io) {
      const opp = other(io.ctx.owner)
      const out: { slot: number; stat: 'a' | 'd' }[] = []
      for (let n = 0; n < count; n++) {
        const left = slots(io.s.players[opp].field).filter(
          (i) => fits(io.s, io.ctx, i) && !out.some((x) => x.slot === i),
        )
        if (!left.length) break
        const slot = slotFromId(
          io.pick(
            io.ctx.owner,
            `Choose the opponent's ${what} for a debuff token${count > 1 ? ` (${n + 1} of ${count})` : ''}.`,
            left.map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
          ),
        )
        const st =
          stat ??
          (io.pick(io.ctx.owner, 'Which value does the token lower?', [
            { id: 'stat:a', label: 'Attack' },
            { id: 'stat:d', label: 'Defense' },
          ]) === 'stat:a'
            ? 'a'
            : 'd')
        out.push({ slot, stat: st })
      }
      return out
    },
    apply(d, ctx, picks) {
      const opp = other(ctx.owner)
      for (const { slot, stat: st } of picks) {
        const f = d.players[opp].field[slot]
        log(
          d,
          `${cardName(d, ctx.card)}: a debuff token on ${d.players[opp].name}'s ${f.faceUp ? cardName(d, f.card) : 'face-down card'} (${slotName(slot)}), −1 ${st === 'a' ? 'Attack' : 'Defense'}.`,
        )
        placeToken(d, opp, slot, st)
      }
    },
  }
}

// ---- Hire ----

/** Support cards that may be hired out (a Runaway Familiar can't: hiring out counts as resting). */
const hireOut = (s: AsState, ctx: Ctx, reserved: string[]) =>
  s.players[ctx.owner].support.filter(
    (c) => c !== ctx.card && !reserved.includes(c) && !rulesOf(s, c)?.runaway,
  )
/** Rest-zone cards that may be hired back (not a face-down, locked one). */
const hireIn = (s: AsState, ctx: Ctx) =>
  s.players[ctx.owner].rest.filter((c) => c !== ctx.card && !isLocked(s, ctx.owner, c))

/** Hire: swap a card (or up to `n`) in your Support with a card in your rest zone. */
export function hire(n: number): Ability<[string, string][]> {
  return {
    name:
      n > 1
        ? `Hire: swap up to ${n} Support cards with rest-zone cards`
        : 'Hire: swap a Support card with a rest-zone card',
    can: (s, ctx) => hireOut(s, ctx, []).length > 0 && hireIn(s, ctx).length > 0,
    plan(io) {
      const out: [string, string][] = []
      for (let k = 0; k < n; k++) {
        const outs = hireOut(io.s, io.ctx, [...io.reserved, ...out.map((x) => x[0])])
        const ins = hireIn(io.s, io.ctx).filter((c) => !out.some((x) => x[1] === c))
        if (!outs.length || !ins.length) break
        if (k > 0) {
          const more = io.pick(io.ctx.owner, 'Hire another card?', [
            { id: 'hire:more', label: 'Swap another' },
            { id: 'hire:done', label: 'Done' },
          ])
          if (more === 'hire:done') break
        }
        const a = cardFromId(
          io.pick(
            io.ctx.owner,
            'Hire: choose a Support card to rest.',
            outs.map((c) => cardOption(io.s, c)),
          ),
        )
        const b = cardFromId(
          io.pick(
            io.ctx.owner,
            'Hire: choose a rest-zone card to take into Support.',
            ins.map((c) => cardOption(io.s, c, 'rest')),
          ),
        )
        out.push([a, b])
      }
      return out
    },
    apply(d, ctx, pairs) {
      const p = d.players[ctx.owner]
      for (const [a, b] of pairs) {
        if (!p.support.includes(a) || !p.rest.includes(b)) continue
        log(
          d,
          `${cardName(d, ctx.card)}: Hire. ${p.name} rests ${cardName(d, a)} and takes ${cardName(d, b)} into their Support.`,
        )
        p.rest.splice(p.rest.indexOf(b), 1)
        rest(d, ctx.owner, a)
        p.support.push(b)
      }
    },
  }
}

// ---- Swaps ----

/** Swap this card's position with another [word] card on your field (Goblin Ambusher). */
export function selfSwapWith(word: string): Ability<number> {
  const fits = (s: AsState, ctx: Ctx, i: number) => {
    const f = s.players[ctx.owner].field[i]
    return !!f.card && f.card !== ctx.card && f.faceUp && inArchetype(s, f.card, word)
  }
  return {
    name: `Swap places with another ${word} card`,
    can: (s, ctx) => slots(s.players[ctx.owner].field).some((i) => fits(s, ctx, i)),
    plan(io) {
      return slotFromId(
        io.pick(
          io.ctx.owner,
          `Choose the ${word} card ${cardName(io.s, io.ctx.card)} swaps places with.`,
          slots(io.s.players[io.ctx.owner].field)
            .filter((i) => fits(io.s, io.ctx, i))
            .map((i) => slotOption(io.s, io.ctx.owner, i, io.ctx.owner)),
        ),
      )
    },
    apply(d, ctx, slot) {
      const self = slotOf(d, ctx.owner, ctx.card)
      if (self < 0) return
      log(
        d,
        `${cardName(d, ctx.card)}: swaps places with ${cardName(d, d.players[ctx.owner].field[slot].card)}.`,
      )
      swapSlots(d, { seat: ctx.owner, slot: self }, { seat: ctx.owner, slot })
    },
  }
}

/** Swap the positions of two [word] cards on your field (War Drummer). Face-down cards are yours to know. */
export function swapTwoOwn(word: string): Ability<[number, number]> {
  const fits = (s: AsState, seat: Seat, i: number) => {
    const c = s.players[seat].field[i].card
    return !!c && inArchetype(s, c, word)
  }
  return {
    name: `Swap two ${word} cards on your field`,
    can: (s, ctx) =>
      slots(s.players[ctx.owner].field).filter((i) => fits(s, ctx.owner, i)).length >= 2,
    plan(io) {
      const own = io.ctx.owner
      const list = slots(io.s.players[own].field).filter((i) => fits(io.s, own, i))
      const a = slotFromId(
        io.pick(
          own,
          `Choose a ${word} card to move.`,
          list.map((i) => slotOption(io.s, own, i, own)),
        ),
      )
      const b = slotFromId(
        io.pick(
          own,
          `Choose the ${word} card it swaps places with.`,
          list.filter((i) => i !== a).map((i) => slotOption(io.s, own, i, own)),
        ),
      )
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
}

/** Swap a [word] card on your field with a card from your Support; the card placed is Ready (Sahuagin Reef-Strider). */
export function swapInFor(word: string): Ability<[number, string]> {
  const fits = (s: AsState, ctx: Ctx, i: number) => {
    const c = s.players[ctx.owner].field[i].card
    return !!c && c !== ctx.card && inArchetype(s, c, word)
  }
  return {
    name: `Swap a ${word} field card with a Support card`,
    can: (s, ctx) =>
      slots(s.players[ctx.owner].field).some((i) => fits(s, ctx, i)) &&
      s.players[ctx.owner].support.some((c) => c !== ctx.card),
    plan(io) {
      const own = io.ctx.owner
      const slot = slotFromId(
        io.pick(
          own,
          `Choose a ${word} card on your field to swap out.`,
          slots(io.s.players[own].field)
            .filter((i) => fits(io.s, io.ctx, i))
            .map((i) => slotOption(io.s, own, i, own)),
        ),
      )
      const card = cardFromId(
        io.pick(
          own,
          'Choose the Support card that takes its place (it is Ready).',
          io.s.players[own].support
            .filter((c) => c !== io.ctx.card && !io.reserved.includes(c))
            .map((c) => cardOption(io.s, c)),
        ),
      )
      return [slot, card]
    },
    apply(d, ctx, [slot, card]) {
      log(
        d,
        `${cardName(d, ctx.card)}: ${d.players[ctx.owner].name} swaps the card at ${slotName(slot)} with a card from their Support.`,
      )
      swapIn(d, ctx.owner, slot, card, true)
    },
  }
}

/** Swap the positions of two face-down cards on the opponent's field (Snowblind Tracker). */
export const swapTwoFaceDown: Ability<[number, number]> = {
  name: "Swap two of the opponent's face-down cards",
  can: (s, ctx) =>
    s.players[other(ctx.owner)].field.filter(
      (f, i) => f.card && !f.faceUp && touchable(s, ctx, other(ctx.owner), i, { move: true }),
    ).length >= 2,
  plan(io) {
    const opp = other(io.ctx.owner)
    const field = io.s.players[opp].field
    const list = slots(field).filter(
      (i) =>
        field[i].card &&
        !field[i].faceUp &&
        touchable(io.s, io.ctx, opp, i, { target: true, move: true }),
    )
    const a = slotFromId(
      io.pick(
        io.ctx.owner,
        "Choose an opponent's face-down card to move.",
        list.map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
      ),
    )
    const b = slotFromId(
      io.pick(
        io.ctx.owner,
        'Choose the face-down card it swaps places with.',
        list.filter((i) => i !== a).map((i) => slotOption(io.s, opp, i, io.ctx.owner)),
      ),
    )
    return [a, b]
  },
  apply(d, ctx, [a, b]) {
    const opp = other(ctx.owner)
    log(
      d,
      `${cardName(d, ctx.card)}: ${d.players[opp].name}'s face-down cards at ${slotName(a)} and ${slotName(b)} swap places.`,
    )
    swapSlots(d, { seat: opp, slot: a }, { seat: opp, slot: b })
  },
}

// ---- Round effects on a target ----

type Flag = 'shielded' | 'noMain' | 'interpose' | 'stay'

const FLAG_TEXT: Record<Flag, string> = {
  shielded: "can't be the target of an opponent's ability this round",
  noMain: "can't be the Main Attacker this round",
  interpose: 'has Interpose this round',
  stay: 'stays on the field at Regroup',
}

function flag(d: D, seat: Seat, flagName: Flag, card: string) {
  const r = d.players[seat].round
  r[flagName] = [...(r[flagName] ?? []), card]
}

/**
 * Target a ready card (yours or the opponent's), and give it a round effect.
 * `weapon`: only a card with a Living Weapon attached (Armiger Warden).
 */
export function markReady(
  whose: 'own' | 'opponent',
  flagName: Flag,
  { weapon = false }: { weapon?: boolean } = {},
): Ability<number> {
  const seatOf = (ctx: Ctx) => (whose === 'own' ? ctx.owner : other(ctx.owner))
  const fits = (s: AsState, ctx: Ctx, i: number) => {
    const f = s.players[seatOf(ctx)].field[i]
    return (
      !!f.card &&
      f.state === 'ready' &&
      (!weapon || !!f.weapon) &&
      touchable(s, ctx, seatOf(ctx), i, { target: true })
    )
  }
  const what = `${whose === 'own' ? 'your' : "the opponent's"} ready card${weapon ? ' with a Living Weapon' : ''}`
  return {
    name: `Target ${what}: it ${FLAG_TEXT[flagName]}`,
    can: (s, ctx) => slots(s.players[seatOf(ctx)].field).some((i) => fits(s, ctx, i)),
    plan(io) {
      const seat = seatOf(io.ctx)
      return slotFromId(
        io.pick(
          io.ctx.owner,
          `Choose ${what}.`,
          slots(io.s.players[seat].field)
            .filter((i) => fits(io.s, io.ctx, i))
            .map((i) => slotOption(io.s, seat, i, io.ctx.owner)),
        ),
      )
    },
    apply(d, ctx, slot) {
      const seat = seatOf(ctx)
      const f = d.players[seat].field[slot]
      if (!f.card) return
      log(
        d,
        `${cardName(d, ctx.card)}: ${f.faceUp ? cardName(d, f.card) : 'the face-down card'} at ${slotName(slot)} ${FLAG_TEXT[flagName]}.`,
      )
      flag(d, seat, flagName, f.card)
    },
  }
}

/** This card joins the attackers (Armiger Trialmaster gives it to a weapon's host). */
export const hostJoinsAttackers: Ability<number> = {
  name: 'A card with a Living Weapon joins the attackers this round',
  can: (s, ctx) =>
    s.players[ctx.owner].field.some((f) => f.card && f.state === 'ready' && f.weapon),
  plan(io) {
    const own = io.ctx.owner
    return slotFromId(
      io.pick(
        own,
        'Choose your ready card with a Living Weapon attached.',
        slots(io.s.players[own].field)
          .filter((i) => {
            const f = io.s.players[own].field[i]
            return f.card && f.state === 'ready' && f.weapon
          })
          .map((i) => slotOption(io.s, own, i, own)),
      ),
    )
  },
  apply(d, ctx, slot) {
    const card = d.players[ctx.owner].field[slot].card
    if (!card) return
    d.players[ctx.owner].round.extra.push(card)
    log(
      d,
      `${cardName(d, ctx.card)}: ${cardName(d, card)} will attack this round, whatever its Fate Number.`,
    )
  },
}

// ---- Interpose and Endure ----

/** "Rest N: Interpose" (paid when the stacks form): this card has Interpose this round. */
export const interposeSelf: Ability<null> = {
  name: 'Interpose',
  can: (s, ctx) =>
    s.players[ctx.owner].field.some((f) => f.card === ctx.card && f.state === 'defending'),
  plan: () => null,
  apply(d, ctx) {
    log(d, `${cardName(d, ctx.card)}: Interpose. It joins the defense stack.`)
    flag(d, ctx.owner, 'interpose', ctx.card)
  },
}

/** Endure: stay on the field at Regroup (face down and Ready). */
export const endureSelf: Ability<null> = {
  name: 'Endure: stay on the field',
  optional: true,
  plan: () => null,
  apply(d, ctx) {
    log(d, `${cardName(d, ctx.card)}: Endure. It stays on the field.`)
    flag(d, ctx.owner, 'stay', ctx.card)
  },
}

// ---- Living Weapons ----

export const isWeapon = (s: AsState, card: string) => inArchetype(s, card, 'Living Weapon')

/** Hosts a weapon may go on: your ready cards (face down too), or the opponent's face-up ones. */
function hosts(s: AsState, ctx: Ctx, side: 'own' | 'opponent', state: 'ready' | 'faceUp') {
  const seat = side === 'own' ? ctx.owner : other(ctx.owner)
  return slots(s.players[seat].field).filter((i) => {
    const f = s.players[seat].field[i]
    if (!f.card || f.weapon || f.card === ctx.card) return false
    if (state === 'ready' ? f.state !== 'ready' : !f.faceUp) return false
    return side === 'own' || touchable(s, ctx, seat, i, { target: true })
  })
}

const inSkirmish = (s: AsState) => s.phase === 'skirmish'

/** Put a weapon card (lifted from wherever it is) on a field card. */
function attach(d: D, owner: Seat, weapon: string, seat: Seat, slot: number) {
  lift(d, owner, weapon)
  d.players[seat].field[slot].weapon = { card: weapon, owner }
}

export interface AttachOptions {
  /** Whose card it goes on. */
  side: 'own' | 'opponent'
  /** And then: that card has Interpose, or can't be the Main Attacker, this round. */
  then?: 'interpose' | 'noMain'
}

/** "Attach this card to a ready card on your field" (or a face-up card on the opponent's field). */
export function attachSelf({ side, then }: AttachOptions): Ability<number> {
  const state = side === 'own' ? 'ready' : 'faceUp'
  const where =
    side === 'own' ? 'a ready card on your field' : "a face-up card on the opponent's field"
  return {
    name: `Attach to ${where}`,
    can: (s, ctx) => inSkirmish(s) && hosts(s, ctx, side, state).length > 0,
    plan(io) {
      const seat = side === 'own' ? io.ctx.owner : other(io.ctx.owner)
      return slotFromId(
        io.pick(
          io.ctx.owner,
          `Choose ${where} for ${cardName(io.s, io.ctx.card)}.`,
          hosts(io.s, io.ctx, side, state).map((i) => slotOption(io.s, seat, i, io.ctx.owner)),
        ),
      )
    },
    apply(d, ctx, slot) {
      const seat = side === 'own' ? ctx.owner : other(ctx.owner)
      const host = d.players[seat].field[slot]
      if (!host.card) return
      log(
        d,
        `${cardName(d, ctx.card)} attaches to ${host.faceUp ? cardName(d, host.card) : 'a face-down card'} (${slotName(slot)}).`,
      )
      const card = host.card
      attach(d, ctx.owner, ctx.card, seat, slot)
      if (then) {
        log(d, `${cardName(d, card)} ${FLAG_TEXT[then]}.`)
        flag(d, seat, then, card)
      }
    },
  }
}

/** Attach a Living Weapon from your Support (Armiger Proctor) or rest zone (Armiger Bestower) to your ready card. */
export function attachFrom(from: 'support' | 'rest'): Ability<[string, number]> {
  const weapons = (s: AsState, ctx: Ctx, reserved: string[]) =>
    s.players[ctx.owner][from].filter(
      (c) =>
        c !== ctx.card &&
        !reserved.includes(c) &&
        isWeapon(s, c) &&
        !(from === 'rest' && isLocked(s, ctx.owner, c)),
    )
  const zone = from === 'support' ? 'Support' : 'rest zone'
  return {
    name: `Attach a Living Weapon from your ${zone}`,
    can: (s, ctx) =>
      inSkirmish(s) && weapons(s, ctx, []).length > 0 && hosts(s, ctx, 'own', 'ready').length > 0,
    plan(io) {
      const w = cardFromId(
        io.pick(
          io.ctx.owner,
          `Choose a Living Weapon in your ${zone}.`,
          weapons(io.s, io.ctx, io.reserved).map((c) => cardOption(io.s, c)),
        ),
      )
      const slot = slotFromId(
        io.pick(
          io.ctx.owner,
          `Choose your ready card to attach ${cardName(io.s, w)} to.`,
          hosts(io.s, io.ctx, 'own', 'ready').map((i) =>
            slotOption(io.s, io.ctx.owner, i, io.ctx.owner),
          ),
        ),
      )
      return [w, slot]
    },
    apply(d, ctx, [w, slot]) {
      const host = d.players[ctx.owner].field[slot]
      if (!host.card || host.weapon || !d.players[ctx.owner][from].includes(w)) return
      log(
        d,
        `${cardName(d, ctx.card)}: ${cardName(d, w)} attaches to ${host.faceUp ? cardName(d, host.card) : 'a face-down card'} (${slotName(slot)}).`,
      )
      attach(d, ctx.owner, w, ctx.owner, slot)
    },
  }
}

/** Rest up to N Living Weapons from your Support (Armiger Custodian). */
export function restWeapons(n: number): Ability<string[]> {
  const list = (s: AsState, ctx: Ctx, skip: string[]) =>
    s.players[ctx.owner].support.filter(
      (c) => c !== ctx.card && !skip.includes(c) && isWeapon(s, c),
    )
  return {
    name: `Rest up to ${n} Living Weapons from your Support`,
    can: (s, ctx) => list(s, ctx, []).length > 0,
    plan(io) {
      const out: string[] = []
      for (let k = 0; k < n; k++) {
        const left = list(io.s, io.ctx, [...io.reserved, ...out])
        if (!left.length) break
        const id = io.pick(
          io.ctx.owner,
          `Choose a Living Weapon to rest${k ? ' (or stop)' : ''}.`,
          [...left.map((c) => cardOption(io.s, c)), ...(k ? [{ id: 'done', label: 'Done' }] : [])],
        )
        if (id === 'done') break
        out.push(cardFromId(id))
      }
      return out
    },
    apply(d, ctx, cards) {
      for (const c of cards) {
        if (!d.players[ctx.owner].support.includes(c)) continue
        log(d, `${cardName(d, ctx.card)}: ${d.players[ctx.owner].name} rests ${cardName(d, c)}.`)
        rest(d, ctx.owner, c)
      }
    },
  }
}

/**
 * Armiger Page: target a Living Weapon on your field. It goes to your rest zone,
 * and this card takes its position, inheriting its state.
 */
export const pageSwap: Ability<number> = {
  name: 'Take the place of a Living Weapon on your field',
  can: (s, ctx) => s.players[ctx.owner].field.some((f) => f.card && isWeapon(s, f.card)),
  plan(io) {
    const own = io.ctx.owner
    return slotFromId(
      io.pick(
        own,
        'Choose a Living Weapon on your field.',
        slots(io.s.players[own].field)
          .filter((i) => {
            const c = io.s.players[own].field[i].card
            return c && isWeapon(io.s, c)
          })
          .map((i) => slotOption(io.s, own, i, own)),
      ),
    )
  },
  apply(d, ctx, slot) {
    const p = d.players[ctx.owner]
    const old = p.field[slot]
    if (!old.card || !p.support.includes(ctx.card)) return
    log(d, `${cardName(d, ctx.card)} takes the place of ${cardName(d, old.card)}, which rests.`)
    const weapon = old.card
    swapIn(d, ctx.owner, slot, ctx.card, false)
    // swapIn put the weapon in Support; it rests instead.
    p.support.splice(p.support.indexOf(weapon), 1)
    p.rest.push(weapon)
  },
}

/** Once per response window (Unassuming Mage): the window is the reveal it follows. */
export function oncePerWindow<P>(ab: Ability<P>): Ability<P> {
  const key = (s: AsState, ctx: Ctx) => `${s.skirmish.reveals}:${ctx.card}`
  return {
    ...ab,
    can: (s, ctx) =>
      inSkirmish(s) &&
      !(s.players[ctx.owner].round.window ?? []).includes(key(s, ctx)) &&
      (!ab.can || ab.can(s, ctx)),
    apply(d, ctx, plan) {
      ab.apply(d, ctx, plan)
      const r = d.players[ctx.owner].round
      r.window = [...(r.window ?? []), key(d as AsState, ctx)]
    },
  }
}

/** Living Weapons attached to a player's field cards. */
export const weaponsOn = (s: AsState, seat: Seat) =>
  s.players[seat].field.filter((f) => f.weapon && f.weapon.owner === seat).length
