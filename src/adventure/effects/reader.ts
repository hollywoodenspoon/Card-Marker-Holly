import type { AsCard } from '../cards'
import { other, type AsState, type Engagement, type Seat } from '../state'
import * as B from './blocks'
import { archInRest, archOnField, faceUp, inArchetype, isCenterSlot, restCount } from './helpers'
import type { Ability, CardRules, Ctx, D } from './types'

/**
 * The card reader: a card's rules come from its printed ability (`Ability_AS`)
 * and its type (`Type_AS`), nothing else. The text is read clause by clause
 * against a list of known phrases (docs/card-text-phrases.md lists them). A
 * card with any clause the reader doesn't know plays with its stats only, and
 * the app says which words it couldn't read.
 */

export interface Reading {
  /** The card's rules, or null when part of its text couldn't be read. */
  rules: CardRules | null
  /** The parts of the text the reader didn't understand. */
  unread: string[]
}

/** What a condition looks at. */
interface Q {
  s: AsState
  seat: Seat
  card: string
  slot?: number
  e?: Engagement | null
}
type Test = (q: Q) => boolean

/** A clause's conditions ("Defending Side:", "Initiative, 3+ Rest Zone:", "Rest 1:"). */
interface Conds {
  tests: Test[]
  once: boolean
  cost: number
}

const all =
  (c: Conds): Test =>
  (q) =>
    c.tests.every((t) => t(q))

type Mode = Ctx['mode']

interface Build {
  /** How the card's action is used, from its type (Inherent and Rest cards have none). */
  mode: Mode | null
  rules: CardRules
  fs: { test: Test; n: number }[]
  stat: ((q: Q, v: { a: number; d: number }) => { a: number; d: number })[]
  ability?: Ability
  keep?: (d: D, ctx: Ctx) => boolean
}

const MODE: Record<string, Mode | null> = {
  Field: 'field',
  Support: 'support',
  Flip: 'flip',
  Battle: 'battle',
  Inherent: null,
  Rest: null,
}

/** "grave" → "Grave" (archetype words are matched without case). */
const word = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

const W = "(?<w>[a-z][a-z'-]*)"

// ---- Conditions ----

const CONDITIONS: [RegExp, (g: Record<string, string>) => Test][] = [
  [/^attacking side$/, () => (q) => !!q.e && q.e.attacker === q.seat],
  [/^defending side$/, () => (q) => !!q.e && q.e.attacker !== q.seat],
  [/^initiative$/, () => (q) => q.s.initiative === q.seat],
  [/^no-initiative$/, () => (q) => q.s.initiative !== q.seat],
  [/^(?<n>\d+)\+ rest zone$/, (g) => (q) => restCount(q.s, q.seat) >= Number(g.n)],
  [
    /^if you have (?<n>\d+) or more cards in your rest zone$/,
    (g) => (q) => restCount(q.s, q.seat) >= Number(g.n),
  ],
  [
    new RegExp(`^if an? ${W} card is also on your field$`),
    (g) => (q) => archOnField(q.s, q.seat, g.w, q.card),
  ],
  [
    new RegExp(`^if an? ${W} card is in your rest zone$`),
    (g) => (q) => archInRest(q.s, q.seat, g.w, q.card),
  ],
  [
    /^if (?:your )?opponent has an ace on their field$/,
    () => (q) => faceUp(q.s, other(q.seat)).some((x) => q.s.cards[x.card]?.ace),
  ],
  [/^center$/, () => (q) => q.slot !== undefined && isCenterSlot(q.slot)],
  [/^flank$/, () => (q) => q.slot !== undefined && !isCenterSlot(q.slot)],
  [/^first engagement$/, () => (q) => !!q.e && B.fought(q.s).length === 0],
  [/^second engagement$/, () => (q) => !!q.e && B.fought(q.s).length === 1],
  [/^won (?:the )?first engagement$/, () => (q) => !!q.e && B.fought(q.s)[0]?.scorer === q.seat],
  [
    /^lost (?:the )?previous engagement$/,
    () => (q) => !!q.e && B.fought(q.s).at(-1)?.scorer === other(q.seat),
  ],
  [
    new RegExp(`^if an? ${W} card was revealed as fighting spirit this engagement$`),
    (g) => (q) => !!q.e && q.e.fs[q.seat].some((x) => inArchetype(q.s, x.card, g.w)),
  ],
  // Echo Bond: the same check (this card isn't counted: it is checked before it
  // joins the Fighting Spirit).
  [
    new RegExp(
      `^if another ${W} card was already revealed (?:as fighting spirit )?this engagement$`,
    ),
    (g) => (q) => !!q.e && q.e.fs[q.seat].some((x) => inArchetype(q.s, x.card, g.w)),
  ],
  [
    /^if (?:your )?opponent has (?<n>\d+)(?:\+| or more) cards in their rest zone$/,
    (g) => (q) => restCount(q.s, other(q.seat)) >= Number(g.n),
  ],
  [
    /^if you have (?<n>\d+) or fewer cards in (?:your )?support$/,
    (g) => (q) => q.s.players[q.seat].support.length <= Number(g.n),
  ],
  [
    /^if (?:your )?opponent's main attacker is in the (?<pos>center|flank)$/,
    (g) => (q) => {
      const main = q.s.players[other(q.seat)].mainAttacker
      return main !== null && isCenterSlot(main) === (g.pos === 'center')
    },
  ],
  // First Blood: the first card revealed this Engagement. Ambush: the opponent has passed.
  [/^first blood$/, () => (q) => !!q.e && q.e.fs[0].length + q.e.fs[1].length === 0],
  [/^ambush$/, () => (q) => !!q.e && q.e.passed[other(q.seat)]],
]

/** Keyword names before a colon whose rule the rest of the clause spells out. */
const LABELS = [/^(?:field|fallen|echo) bond$/, /^(?:attack|defense) (?:override|surge|unbound)$/]

function readConds(text: string | undefined): Conds | null {
  const c: Conds = { tests: [], once: false, cost: 0 }
  if (!text) return c
  for (const part of text.split(/: |, /)) {
    if (LABELS.some((re) => re.test(part))) continue
    if (part === 'once per round') {
      c.once = true
      continue
    }
    const cost = /^rest (\d+)$/.exec(part)
    if (cost) {
      c.cost = Number(cost[1])
      continue
    }
    const found = CONDITIONS.find(([re]) => re.test(part))
    if (!found) return null
    c.tests.push(found[1](found[0].exec(part)!.groups ?? {}))
  }
  return c
}

// ---- Phrases ----

/**
 * One phrase. `read` returns false when the phrase can't apply to this card
 * (then its words stay unread).
 */
interface Phrase {
  body: string
  read(g: Record<string, string>, c: Conds, b: Build): boolean
}

/** Conditions that only make sense for an action ("Once per round", "Rest N"). */
const actionOnly = (c: Conds) => c.once || c.cost > 0

/** A passive clause: no cost or once-per-round. */
function passive(
  body: string,
  read: (g: Record<string, string>, c: Conds, b: Build) => void,
): Phrase {
  return {
    body,
    read(g, c, b) {
      if (actionOnly(c)) return false
      read(g, c, b)
      return true
    },
  }
}

/** A flag that takes no conditions. */
const flag = (body: string, set: (r: CardRules) => void): Phrase => ({
  body,
  read(_g, c, b) {
    if (actionOnly(c) || c.tests.length) return false
    set(b.rules)
    return true
  },
})

/** The card's action (one per card), used the way its type says. */
function action(
  body: string,
  make: (g: Record<string, string>, b: Build) => Ability | null,
): Phrase {
  return {
    body,
    read(g, c, b) {
      if (!b.mode || b.ability) return false
      // A cost or once-per-round only for abilities a player chooses to use.
      if (actionOnly(c) && b.mode !== 'field' && b.mode !== 'support') return false
      let ab = make(g, b)
      if (!ab) return false
      if (c.cost) ab = B.withCost(ab, c.cost) as Ability
      if (c.once) ab = B.oncePerRound(ab)
      if (c.tests.length) {
        const test = all(c)
        ab = B.when(ab, (s, ctx) => test({ s, seat: ctx.owner, card: ctx.card, e: s.engagement }))
      }
      b.ability = ab
      return true
    },
  }
}

/** Support Abilities: the card isn't rested after use (when `when` holds). */
function keep(
  body: string,
  when: (g: Record<string, string>) => (d: D, ctx: Ctx) => boolean,
): Phrase {
  return {
    body,
    read(g, c, b) {
      if (b.mode !== 'support' || b.keep || actionOnly(c)) return false
      // Conditions before the colon, or after: "…after use if you have 3 or fewer cards in Support."
      const tail = readConds(g.tail)
      if (!tail) return false
      const test = all({ ...c, tests: [...c.tests, ...tail.tests] })
      const base = when(g)
      b.keep = (d, ctx) =>
        base(d, ctx) && test({ s: d as AsState, seat: ctx.owner, card: ctx.card, e: d.engagement })
      return true
    },
  }
}

const always = () => () => true

/** "You may…": the owner is asked first. */
const may = <P>(g: Record<string, string>, ab: Ability<P>): Ability<P> =>
  g.may ? { ...ab, optional: true } : ab

const PHRASES: Phrase[] = [
  // Fighting Spirit from the rest zone (Rest cards).
  passive(
    'flip a coin\\. heads: you may use this card for fighting spirit this engagement, and it gets \\+(?<n>\\d+) fs\\. tails: nothing happens(?:, and you may still reveal fighting spirit or pass)?',
    (g, c, b) => {
      const test = all(c)
      b.rules.restFs = {
        can: (s, seat, card) => test({ s, seat, card, e: s.engagement }),
        bonus: Number(g.n),
        coin: true,
      }
    },
  ),
  passive(
    'you may use this card for fighting spirit this engagement\\. it gets \\+(?<n>\\d+) fs',
    (g, c, b) => {
      const test = all(c)
      b.rules.restFs = {
        can: (s, seat, card) => test({ s, seat, card, e: s.engagement }),
        bonus: Number(g.n),
      }
    },
  ),
  // Fighting Spirit when revealed.
  passive(
    'flip a coin when revealed: heads \\+(?<h>\\d+) fs, tails \\+(?<t>\\d+) fs instead of (?:the |its )?printed value',
    (g, _c, b) => (b.rules.fsCoin = { heads: Number(g.h), tails: Number(g.t) }),
  ),
  // Only Battle Abilities change Fighting Spirit (Field, Flip and Inherent are A/D only).
  {
    body: '(?:an additional )?\\+(?<n>\\d+) fs',
    read(g, c, b) {
      if (actionOnly(c) || b.mode !== 'battle') return false
      b.fs.push({ test: all(c), n: Number(g.n) })
      return true
    },
  },
  // Stats while face up on the field.
  passive(
    '\\+(?<a>\\d+) (?<x>attack|defense)(?: and \\+(?<b>\\d+) (?<y>attack|defense))?',
    (g, c, b) => {
      const test = all(c)
      const add = { attack: 0, defense: 0 }
      add[g.x as 'attack' | 'defense'] += Number(g.a)
      if (g.y) add[g.y as 'attack' | 'defense'] += Number(g.b)
      b.stat.push((q, v) => (test(q) ? { a: v.a + add.attack, d: v.d + add.defense } : v))
    },
  ),
  passive("this card's attack value and defense value are swapped", (_g, c, b) => {
    const test = all(c)
    b.stat.push((q, v) => (test(q) ? { a: v.d, d: v.a } : v))
  }),
  passive('defense unbound', (_g, c, b) => {
    const test = all(c)
    b.rules.defenseUnbound = (s, seat) => test({ s, seat, card: '', e: s.engagement })
  }),
  // Protections and other lasting rules.
  flag(
    "(?:this card )?(?:may not|cannot|can't) be the target of (?:an )?opponent's field abilit(?:y|ies)",
    (r) => (r.fieldProof = true),
  ),
  flag(
    "(?:this card )?(?:cannot|can't|may not) be repositioned by (?:an )?opponent's abilit(?:y|ies)",
    (r) => (r.fixed = true),
  ),
  flag(
    'whenever this card would be rested, it goes to your support instead',
    (r) => (r.runaway = true),
  ),
  flag('this card cannot be rested to pay a cost', (r) => (r.unpayable = true)),
  // Actions.
  action(`non-adjacent (?:${W} )?cards are counted for (?<side>attack|defense)`, (g) =>
    B.unboundFor(g.side as 'attack' | 'defense', g.w ? word(g.w) : null),
  ),
  action('target player rests a card from their support', () => B.playerRests),
  action('opponent rests a card from their support(?:, if able)?', (_g, b) =>
    b.mode === 'field' || b.mode === 'support'
      ? { ...B.opponentRests, can: (s, ctx) => s.players[other(ctx.owner)].support.length > 0 }
      : B.opponentRests,
  ),
  action('(?<may>you may )?swap one of your attackers (?:to|with) one of your defenders', (g, b) =>
    b.mode === 'battle' ? may(g, B.switchSides) : null,
  ),
  action(
    "(?<may>you may )?swap this card's position with (?:a|another) (?<ready>ready )?card on your field(?<inherit>\\. this card inherits the state of the card it swapped with)?",
    (g, b) =>
      b.mode === 'battle' && !g.inherit
        ? may(g, B.decoy(!!g.ready))
        : b.mode === 'support'
          ? may(g, B.swapInSelf(!!g.ready, !!g.inherit))
          : !g.inherit
            ? may(g, B.selfSwap(!!g.ready))
            : null,
  ),
  action("swap (?:the )?target opponent's card's position with another card on their field", () =>
    B.opponentPositionSwap(),
  ),
  action(
    "swap target opponent's ready card on the field with a random card from their support\\. the card that enters the field inherits the state of the card it swapped with(?<rested>\\. the card it swapped with is rested)?",
    (g) => (g.rested ? B.swapOutAndRest : B.opponentSwapOut),
  ),
  action(
    'swap a card on your field with a card from your support\\. the card placed on the field is ready',
    () => B.ownSwapIn,
  ),
  action("swap a ready card's position with another ready card on your field", () => B.readySwap),
  action(
    `swap the position of an? ${W} card on your field(?<self> \\(this card included\\))? with another card on your field(?<down>\\. to choose a face-down \\k<w> card, show it to your opponent; it stays face down)?`,
    (g) => B.maneuver(word(g.w), { self: !!g.self, showDown: !!g.down }),
  ),
  action(
    "target (?:an? )?(?<ready>ready )?(?:opponent's card on the field|card on the opponent's field)(?: is|\\. it is) turned to the ability-active position without resolving its ability",
    (g) => B.lockOpponent(!!g.ready),
  ),
  action('(?:your )?opponent reveals a random card from their support to you', () => B.seeSupport),
  action(
    'this card is included in your attacking group this round, regardless of its fate number(?: rank)?',
    () => B.joinAttackers,
  ),
  action(`(?:return|put) an? (?:${W} )?card from your rest zone (?:in)?to your support`, (g) =>
    B.returnFromRest(g.w ? word(g.w) : null),
  ),
  action(
    "copy and use the field ability of a card on the opponent's field(?: \\(excluding abilities that themselves copy another ability\\))?",
    (_g, b) => {
      b.rules.copies = true
      return B.copyAbility as Ability
    },
  ),
  // Support cards that stay in Support.
  keep('reveal this card', always),
  keep('this card (?:is not|does not need to be) rested after use(?: (?<tail>if [^.¦]+))?', always),
  keep(
    `if an? ${W} card is in your rest zone, this card does not need to be rested after use`,
    (g) => (d, ctx) => archInRest(d, ctx.owner, g.w, ctx.card),
  ),
]

/** Each phrase as a whole clause, with its conditions: "[conditions: ]phrase[.]". */
const CLAUSES = PHRASES.map((p) => ({
  p,
  re: new RegExp(`(?<=^|\\. |¦ ?)(?:(?<cond>[^:.¦]+(?:: [^:.¦]+)*): )?${p.body}\\.?`, 'g'),
}))

/** Lower case, symbols as words, one space, curly quotes straight, no ability label. */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\{fightingspirit_as\}/g, 'fs')
    .replace(/\{attack_as\}/g, 'attack')
    .replace(/\{defense_as\}/g, 'defense')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:flip|field|support|battle|rest|inherent) ability: /, '')
}

/** Read a card's rules from its type and printed ability. */
export function readText(type: AsCard['type'], ability: string): Reading {
  let text = normalize(ability)
  const b: Build = { mode: type ? (MODE[type] ?? null) : null, rules: {}, fs: [], stat: [] }
  for (const { p, re } of CLAUSES)
    text = text.replace(re, (...args) => {
      const m = args[0] as string
      const g = (args.at(-1) ?? {}) as Record<string, string>
      const c = readConds(g.cond)
      return c && p.read(g, c, b) ? '¦' : m
    })
  const unread = text
    .split('¦')
    .map((t) => t.trim().replace(/^[.,;:\s]+|[.,;:\s]+$/g, ''))
    .filter(Boolean)
  if (unread.length) return { rules: null, unread }
  finish(b)
  return { rules: b.rules, unread }
}

function finish(b: Build) {
  const { rules, fs, stat } = b
  if (fs.length)
    rules.fs = (s, seat, e, v, card) =>
      v + fs.reduce((n, x) => n + (x.test({ s, seat, card, e }) ? x.n : 0), 0)
  if (stat.length)
    rules.stat = (s, seat, slot, v) => {
      const q = { s, seat, slot, card: s.players[seat].field[slot].card ?? '', e: s.engagement }
      return stat.reduce((acc, f) => f(q, acc), v)
    }
  if (b.ability && b.mode) {
    rules[b.mode] = b.keep ? { ...b.ability, keep: b.keep } : b.ability
  }
}

const byCard = new WeakMap<object, Reading>()
const byText = new Map<string, Reading>()

/** A card's reading (remembered, so the engine can ask often). */
export function readCard(card: Pick<AsCard, 'type' | 'ability'>): Reading {
  let r = byCard.get(card)
  if (r) return r
  const key = `${card.type}|${card.ability}`
  r = byText.get(key)
  if (!r) {
    r = readText(card.type, card.ability)
    byText.set(key, r)
  }
  byCard.set(card, r)
  return r
}
