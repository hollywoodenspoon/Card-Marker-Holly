import { produce, type Draft } from 'immer'
import { nextInt, shuffle } from '@/playtest/rng'
import type { AsCard } from './cards'
import { ADJACENT_PAIRS, neighbours, SLOTS, slotName } from './board'
import { engagementSides, engagementTotals, fightingSpirit } from './stats'
import {
  cardName,
  emptySlot,
  other,
  POINTS_TO_WIN,
  SEATS,
  type AsState,
  type PlayerState,
  type Seat,
} from './state'

/**
 * The Mutual Reveal rules as a pure reducer. `legalMoves` lists what the
 * player to act may do; `apply` plays one move and runs every step that needs
 * no decision. The table UI, the hot-seat game and (later) the bot all go
 * through these two functions.
 */
export type Move =
  | { t: 'place'; card: string; slot: number }
  | { t: 'unplace'; slot: number }
  | { t: 'placeRandom' }
  | { t: 'done' }
  | { t: 'reveal'; slots: number[] }
  | { t: 'pass' }
  | { t: 'first'; attacker: Seat }
  | { t: 'fs'; card: string }

export interface NewGame {
  cards: AsCard[]
  /** Each player's Free Company (card ids). */
  decks: [string[], string[]]
  names: [string, string]
  seed: number
}

type D = Draft<AsState>

function log(d: D, text: string, flag?: boolean) {
  d.log.push(flag ? { n: d.log.length + 1, text, flag } : { n: d.log.length + 1, text })
}

const nameOf = (d: D | AsState, seat: Seat) => d.players[seat].name

export function createGame({ cards, decks, names, seed }: NewGame): AsState {
  const [r, s] = nextInt(seed, 2)
  const initiative = r as Seat
  const player = (seat: Seat): PlayerState => ({
    name: names[seat],
    field: Array.from({ length: SLOTS }, emptySlot),
    support: [...decks[seat]],
    rest: [],
    points: 0,
    mainAttacker: null,
    spent: [],
  })
  const state: AsState = {
    v: 1,
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    players: [player(0), player(1)],
    initiative,
    round: 1,
    phase: 'setup',
    step: { k: 'place', seat: initiative, from: 'support', placed: [] },
    skirmish: { reveals: 0, last: null },
    queue: [],
    engagement: null,
    results: [],
    seed: s,
    winner: null,
    log: [],
  }
  return produce(state, (d) => {
    log(d, `New game: ${names[0]} against ${names[1]}.`)
    log(d, `${names[initiative]} has the initiative.`)
    advance(d)
  })
}

/** The player who must decide next (null when the game is over). */
export const actor = (s: AsState): Seat | null => (s.step.k === 'over' ? null : s.step.seat)

/** Face-down cards a player may reveal on the opponent's field. */
export function revealOptions(s: AsState, seat: Seat, count: 1 | 2): number[][] {
  const field = s.players[other(seat)].field
  const down = field.flatMap((f, i) => (f.card && !f.faceUp ? [i] : []))
  if (count === 2) {
    const pairs = ADJACENT_PAIRS.filter(([a, b]) => down.includes(a) && down.includes(b))
    if (pairs.length) return pairs.map((p) => [...p])
    return down.map((i) => [i])
  }
  // One at a time: next to a card already revealed on that side.
  const next = down.filter((i) => neighbours(i).some((j) => field[j].card && field[j].faceUp))
  return (next.length ? next : down).map((i) => [i])
}

/** Abilities a player may use in a response. Card abilities arrive in a later version. */
export function responseMoves(_s: AsState, _seat: Seat): Move[] {
  return []
}

export function legalMoves(s: AsState): Move[] {
  const st = s.step
  switch (st.k) {
    case 'over':
      return []
    case 'place': {
      const p = s.players[st.seat]
      const pool = p[st.from]
      const empty = p.field.flatMap((f, i) => (f.card ? [] : [i]))
      const out: Move[] = []
      for (const card of pool) for (const slot of empty) out.push({ t: 'place', card, slot })
      for (const slot of st.placed) out.push({ t: 'unplace', slot })
      if (empty.length && pool.length) out.push({ t: 'placeRandom' })
      else out.push({ t: 'done' })
      return out
    }
    case 'reveal':
      return revealOptions(s, st.seat, st.count).map((slots) => ({ t: 'reveal', slots }))
    case 'respond':
      return [...responseMoves(s, st.seat), { t: 'pass' }]
    case 'first':
      return s.queue.map((attacker) => ({ t: 'first', attacker }))
    case 'fs':
      return [...s.players[st.seat].support.map((card): Move => ({ t: 'fs', card })), { t: 'pass' }]
  }
}

const key = (m: Move) =>
  JSON.stringify(m.t === 'reveal' ? { ...m, slots: [...m.slots].sort((a, b) => a - b) } : m)

export const isLegal = (s: AsState, m: Move) => {
  const k = key(m)
  return legalMoves(s).some((l) => key(l) === k)
}

/** Play a move for the player to act. An illegal move returns the same state. */
export function apply(s: AsState, m: Move): AsState {
  if (!isLegal(s, m)) return s
  return produce(s, (d) => {
    play(d, m)
    advance(d)
  })
}

function play(d: D, m: Move) {
  const st = d.step
  if (st.k === 'over') return
  const seat = st.seat
  const p = d.players[seat]
  switch (m.t) {
    case 'place': {
      if (st.k !== 'place') return
      const pool = p[st.from]
      pool.splice(pool.indexOf(m.card), 1)
      p.field[m.slot] = { card: m.card, faceUp: false, state: 'ready' }
      st.placed.push(m.slot)
      return
    }
    case 'unplace': {
      if (st.k !== 'place') return
      p[st.from].push(p.field[m.slot].card!)
      p.field[m.slot] = emptySlot()
      st.placed.splice(st.placed.indexOf(m.slot), 1)
      return
    }
    case 'placeRandom': {
      if (st.k !== 'place') return
      const [pool, seed] = shuffle(p[st.from], d.seed)
      d.seed = seed
      p.field.forEach((f, i) => {
        if (f.card || !pool.length) return
        p.field[i] = { card: pool.shift()!, faceUp: false, state: 'ready' }
        st.placed.push(i)
      })
      p[st.from] = pool
      return
    }
    case 'done':
      if (st.k !== 'place') return
      log(
        d,
        `${p.name} placed ${st.placed.length} card${st.placed.length === 1 ? '' : 's'} face down.`,
      )
      return finishPlace(d, seat)
    case 'reveal': {
      const opp = other(seat)
      const field = d.players[opp].field
      const slots = [...m.slots].sort((a, b) => a - b)
      for (const i of slots) field[i].faceUp = true
      log(
        d,
        `${p.name} reveals ${slots
          .map(
            (i) =>
              `${cardName(d, field[i].card)} (${slotName(i)}, Fate ${d.cards[field[i].card!]?.fate ?? '?'})`,
          )
          .join(' and ')} on ${nameOf(d, opp)}'s field.`,
      )
      d.skirmish.reveals++
      d.skirmish.last = seat
      d.step = { k: 'respond', seat: opp, final: false }
      return
    }
    case 'pass':
      if (st.k === 'respond') return st.final ? assign(d) : nextReveal(d)
      if (st.k === 'fs' && d.engagement) {
        d.engagement.passed[seat] = true
        log(d, `${p.name} passes.`)
        return nextFsTurn(d, seat)
      }
      return
    case 'first':
      d.queue = [m.attacker, ...d.queue.filter((q) => q !== m.attacker)]
      log(d, `${p.name} chooses ${nameOf(d, m.attacker)}'s attack as the First Engagement.`)
      return nextEngagement(d)
    case 'fs': {
      const e = d.engagement
      if (!e) return
      p.support.splice(p.support.indexOf(m.card), 1)
      e.fs[seat].push(m.card)
      p.spent.push(m.card)
      const t = engagementTotals(d, e)
      log(
        d,
        `${p.name} reveals ${cardName(d, m.card)} as Fighting Spirit (+${fightingSpirit(d, seat, m.card)}). Attack ${t.attack} vs Defense ${t.defense}.`,
      )
      return nextFsTurn(d, seat)
    }
  }
}

/** Run every step that needs no decision. */
function advance(d: D) {
  for (let guard = 0; guard < 100; guard++) {
    const st = d.step
    if (st.k === 'respond' && responseMoves(d, st.seat).length === 0) {
      if (st.final) assign(d)
      else nextReveal(d)
    } else if (st.k === 'fs' && d.engagement && d.players[st.seat].support.length === 0) {
      d.engagement.passed[st.seat] = true
      log(d, `${nameOf(d, st.seat)} has no Support left and passes.`)
      nextFsTurn(d, st.seat)
    } else if (
      st.k === 'place' &&
      st.placed.length === 0 &&
      (d.players[st.seat][st.from].length === 0 || d.players[st.seat].field.every((f) => f.card))
    )
      finishPlace(d, st.seat)
    else return
  }
}

function finishPlace(d: D, seat: Seat) {
  const st = d.step
  const from = st.k === 'place' ? st.from : 'support'
  if (seat === d.initiative) {
    d.step = { k: 'place', seat: other(seat), from, placed: [] }
    return
  }
  if (d.phase === 'regroup') {
    d.initiative = other(d.initiative)
    d.round++
  }
  startSkirmish(d)
}

function startSkirmish(d: D) {
  d.phase = 'skirmish'
  d.skirmish = { reveals: 0, last: null }
  d.results = []
  log(d, `Round ${d.round}: Skirmish. ${nameOf(d, d.initiative)} has the initiative.`)
  nextReveal(d)
}

function nextReveal(d: D) {
  const init = d.initiative
  const can = (seat: Seat) => revealOptions(d, seat, 1).length > 0
  const { reveals, last } = d.skirmish
  // Opening reveals: 2 cards each, initiative player first; then 1 at a time, alternating.
  if (reveals < 2) {
    const seat = reveals === 0 ? init : other(init)
    if (can(seat)) return void (d.step = { k: 'reveal', seat, count: 2 })
    d.skirmish.reveals++
    d.skirmish.last = seat
    return nextReveal(d)
  }
  const seat = other(last ?? other(init))
  if (can(seat)) return void (d.step = { k: 'reveal', seat, count: 1 })
  if (can(other(seat))) return void (d.step = { k: 'reveal', seat: other(seat), count: 1 })
  // Everything is revealed: the initiative player's final response.
  d.step = { k: 'respond', seat: init, final: true }
}

/** Attack/Defense Assignment: rank Ready cards by Fate Number, lower half attacks. */
function assign(d: D) {
  for (const seat of SEATS) {
    const p = d.players[seat]
    const ready = p.field
      .flatMap((f, i) => (f.card && f.state === 'ready' ? [i] : []))
      .sort(
        (a, b) => (d.cards[p.field[a].card!]?.fate ?? 0) - (d.cards[p.field[b].card!]?.fate ?? 0),
      )
    const attackers = Math.floor(ready.length / 2)
    ready.forEach((i, k) => (p.field[i].state = k < attackers ? 'attacking' : 'defending'))
    p.mainAttacker = attackers ? ready[0] : null
    // Named in Fate order, so the Main Attacker comes first.
    const atk = ready.slice(0, attackers).map((i) => cardName(d, p.field[i].card))
    const def = ready.slice(attackers).map((i) => cardName(d, p.field[i].card))
    log(
      d,
      `${p.name}: Main Attacker ${atk.length ? `${atk[0]} (${slotName(p.mainAttacker!)})` : 'none'}` +
        `${atk.length > 1 ? `, attacking with ${atk.slice(1).join(', ')}` : ''}; defending: ${def.join(', ') || 'none'}.`,
    )
  }
  startCombat(d)
}

function startCombat(d: D) {
  d.phase = 'combat'
  d.queue = []
  for (const seat of SEATS) {
    if (d.players[seat].mainAttacker !== null) d.queue.push(seat)
    else {
      d.results.push({ attacker: seat, attack: 0, defense: 0, scorer: null, note: 'no-attacker' })
      log(
        d,
        `${nameOf(d, seat)} has no attacking card, so their Engagement scores nothing. (Flagged: the rules don't cover this case yet.)`,
        true,
      )
    }
  }
  if (d.queue.length === 2) {
    d.queue = [d.initiative, other(d.initiative)]
    d.step = { k: 'first', seat: d.initiative }
    return
  }
  nextEngagement(d)
}

const ORDINAL = ['First', 'Second']

function nextEngagement(d: D) {
  if (d.winner) return
  const attacker = d.queue.shift()
  if (attacker === undefined) return regroup(d)
  const def = other(attacker)
  const sides = engagementSides(d, attacker)!
  const main = d.players[attacker].field[sides.main].card
  const target = d.players[def].field[sides.target].card
  const label =
    ORDINAL[d.results.filter((r) => !r.note || r.note === 'no-defenders').length] ?? 'Next'
  log(
    d,
    `${label} Engagement: ${nameOf(d, attacker)}'s ${cardName(d, main)} attacks ${slotName(sides.target)}${target ? ` (${cardName(d, target)})` : ''}.`,
  )
  d.engagement = { attacker, fs: [[], []], passed: [false, false] }
  const t = engagementTotals(d, d.engagement)
  if (sides.defenders.length === 0) {
    d.engagement = null
    log(d, `No defender is on or next to that position: ${nameOf(d, attacker)} scores.`)
    return score(d, {
      attacker,
      attack: t.attack,
      defense: 0,
      scorer: attacker,
      note: 'no-defenders',
    })
  }
  log(d, `Attack ${t.attack} vs Defense ${t.defense}.`)
  d.step = { k: 'fs', seat: d.initiative }
}

function nextFsTurn(d: D, acted: Seat) {
  const e = d.engagement!
  const next = other(acted)
  if (!e.passed[next]) d.step = { k: 'fs', seat: next }
  else if (!e.passed[acted]) d.step = { k: 'fs', seat: acted }
  else {
    const t = engagementTotals(d, e)
    const scorer =
      t.attack > t.defense ? e.attacker : t.defense > t.attack ? other(e.attacker) : null
    d.engagement = null
    log(
      d,
      `Attack ${t.attack} vs Defense ${t.defense}: ${scorer === null ? 'a tie, no points' : `${nameOf(d, scorer)} scores`}.`,
    )
    score(d, { attacker: e.attacker, attack: t.attack, defense: t.defense, scorer })
  }
}

function score(d: D, r: AsState['results'][number]) {
  d.results.push(r)
  if (r.scorer !== null) {
    const p = d.players[r.scorer]
    p.points++
    log(
      d,
      `Points: ${nameOf(d, 0)} ${d.players[0].points}, ${nameOf(d, 1)} ${d.players[1].points}.`,
    )
    if (p.points >= POINTS_TO_WIN) {
      d.winner = { seat: r.scorer, reason: `${POINTS_TO_WIN} points` }
      d.phase = 'over'
      d.step = { k: 'over' }
      log(d, `${p.name} wins with ${POINTS_TO_WIN} points!`)
      return
    }
  }
  nextEngagement(d)
}

/** Regroup: rest spent and unused Support, active field cards to Support, refill from the rest zone. */
function regroup(d: D) {
  d.phase = 'regroup'
  for (const seat of SEATS) {
    const p = d.players[seat]
    p.rest.push(...p.spent, ...p.support)
    p.spent = []
    p.support = []
    p.field.forEach((f, i) => {
      if (!f.card || f.state === 'ready') return
      p.support.push(f.card)
      p.field[i] = emptySlot()
    })
    p.mainAttacker = null
  }
  log(d, 'Regroup: Fighting Spirit and unused Support rest; active field cards go to Support.')
  d.step = { k: 'place', seat: d.initiative, from: 'rest', placed: [] }
}

/** What the player to act is asked to do, in words. */
export function prompt(s: AsState): string {
  const st = s.step
  if (st.k === 'over')
    return s.winner ? `${nameOf(s, s.winner.seat)} wins (${s.winner.reason}).` : 'The game is over.'
  const who = nameOf(s, st.seat)
  switch (st.k) {
    case 'place': {
      const empty = s.players[st.seat].field.filter((f) => !f.card).length
      const pool = s.players[st.seat][st.from].length
      const where = st.from === 'support' ? 'Support' : 'rest zone'
      return empty && pool
        ? `${who}: place cards from your ${where} on your field, face down (${empty} position${empty === 1 ? '' : 's'} left).`
        : `${who}: your field is ready. Confirm when you're done.`
    }
    case 'reveal': {
      const n = revealOptions(s, st.seat, st.count)[0]?.length ?? 1
      const opp = nameOf(s, other(st.seat))
      return n === 2
        ? `${who}: reveal 2 adjacent cards on ${opp}'s field.`
        : `${who}: reveal a card on ${opp}'s field${s.skirmish.reveals >= 2 ? ', next to a revealed one' : ''}.`
    }
    case 'respond':
      return `${who}: respond with an ability, or pass.`
    case 'first':
      return `${who}: choose which Engagement goes first.`
    case 'fs': {
      const e = s.engagement!
      const t = engagementTotals(s, e)
      const side = e.attacker === st.seat ? 'attacking' : 'defending'
      return `${who} (${side}): reveal a Support card as Fighting Spirit, or pass. Attack ${t.attack} vs Defense ${t.defense}.`
    }
  }
}
