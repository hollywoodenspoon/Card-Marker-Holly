import { nextInt } from '@/playtest/rng'
import { fsPreview, legalMoves, type Move } from '../engine'
import { other, type AsState, type Seat } from '../state'
import { engagementTotals } from '../stats'

/**
 * Quick rules of thumb over the legal moves: Easy, and the fast policy the
 * Normal and Hard bots build on (and play out games with). They only read what
 * their seat may know, except the step's own options (which are that seat's
 * to choose from).
 */

export type Rng = { seed: number }
export const roll = (r: Rng, n: number) => {
  const [v, s] = nextInt(r.seed, n)
  r.seed = s
  return v
}
const chance = (r: Rng, p: number) => roll(r, 1000) < p * 1000

/** Easy: any legal move (never taking back a placed card); passes Fighting Spirit half the time. */
export function easyMove(s: AsState, r: Rng): Move {
  const legal = legalMoves(s).filter((m) => m.t !== 'unplace')
  if (s.step.k === 'place')
    return legal.find((m) => m.t === 'placeRandom') ?? legal.find((m) => m.t === 'done')!
  if (s.step.k === 'fs' && chance(r, 0.5)) return { t: 'pass' }
  return legal[roll(r, legal.length)]
}

const fate = (s: AsState, c: string) => s.cards[c]?.fate ?? 0
const fsOf = (s: AsState, c: string) => s.cards[c]?.fs ?? 0

/**
 * Normal placement: keep the best Fighting Spirit in Support; put the lowest
 * Fate Numbers (the attackers) on the Front Line, lowest in the Center so both
 * neighbours back it up, and the rest on the Rear Guard.
 */
function placeMove(s: AsState, seat: Seat): Move {
  const st = s.step
  if (st.k !== 'place') return { t: 'done' }
  const p = s.players[seat]
  const empty = p.field.flatMap((f, i) => (f.card ? [] : [i]))
  const pool = [...p[st.from]]
  if (!empty.length || !pool.length) return { t: 'done' }
  const want = empty.length
  // At setup, the cards with the least Fighting Spirit go on the field.
  const chosen = pool
    .sort((a, b) => fsOf(s, a) - fsOf(s, b) || fate(s, a) - fate(s, b))
    .slice(0, want)
    .sort((a, b) => fate(s, a) - fate(s, b))
  const order = [1, 0, 2, 4, 3, 5].filter((i) => empty.includes(i))
  return { t: 'place', card: chosen[0], slot: order[0] }
}

/** Rules of thumb for every step (fast: no lookahead). */
export function quickMove(s: AsState, r: Rng): Move {
  const st = s.step
  const legal = legalMoves(s)
  if (st.k === 'over') return legal[0]
  const seat = st.seat
  switch (st.k) {
    case 'place':
      return placeMove(s, seat)
    case 'reveal':
      return legal[roll(r, legal.length)]
    case 'respond': {
      const abilities = legal.filter((m) => m.t === 'ability')
      // Abilities that hurt the opponent are always worth it; others now and then.
      const harsh = abilities.filter((m) =>
        /opponent|Attack Unbound/i.test(s.cards[(m as { card: string }).card]?.ability ?? ''),
      )
      if (harsh.length) return harsh[roll(r, harsh.length)]
      if (abilities.length && chance(r, 0.3)) return abilities[roll(r, abilities.length)]
      return { t: 'pass' }
    }
    case 'choose':
      return chooseMove(s, seat, r)
    case 'first':
      return legal.find((m) => m.t === 'first' && m.attacker === seat) ?? legal[0]
    case 'fs':
      return fsMove(s, seat, legal)
  }
}

export function chooseMove(s: AsState, seat: Seat, r: Rng): Move {
  const st = s.step
  if (st.k !== 'choose') return { t: 'pass' }
  const opts = st.options
  const use = opts.find((o) => o.id === 'use')
  if (use) return { t: 'choose', id: use.id }
  const cards = opts.filter((o) => o.card && o.slot === undefined)
  // Giving up a Support card (a cost, or the opponent's demand): the weakest.
  if (cards.length === opts.length && /rest/i.test(st.prompt)) {
    const worst = [...cards].sort((a, b) => fsOf(s, a.card!) - fsOf(s, b.card!))[0]
    return { t: 'choose', id: worst.id }
  }
  // Targets on the opponent's field: the strongest card it knows of.
  const theirs = opts.filter((o) => o.seat === other(seat) && o.slot !== undefined)
  if (theirs.length === opts.length) {
    const known = theirs.filter((o) => s.players[o.seat!].field[o.slot!].faceUp)
    if (known.length) {
      const v = (o: (typeof known)[number]) => {
        const c = s.cards[s.players[o.seat!].field[o.slot!].card!]
        return (c?.a ?? 0) + (c?.d ?? 0)
      }
      return { t: 'choose', id: [...known].sort((a, b) => v(b) - v(a))[0].id }
    }
  }
  return { t: 'choose', id: opts[roll(r, opts.length)].id }
}

/**
 * Fighting Spirit (Combat Tricks): free rest-zone cards first; pass when ahead;
 * otherwise the smallest card that takes the lead, or one that ties when a tie
 * is all that can be had (it denies the point). Unused Support is rested at
 * Regroup anyway, so in the round's last Engagement every card that can still
 * change the result is worth spending; earlier, only cards that come close.
 */
export function fsMove(s: AsState, seat: Seat, legal: Move[]): Move {
  const e = s.engagement
  if (!e) return { t: 'pass' }
  const t = engagementTotals(s, e)
  const mine = e.attacker === seat ? t.attack : t.defense
  const theirs = e.attacker === seat ? t.defense : t.attack
  if (mine > theirs) return { t: 'pass' }
  const gap = theirs - mine
  const theyLocked = e.passed[other(seat)]
  const last = s.queue.length === 0
  const options = legal.flatMap((m) =>
    m.t === 'fs'
      ? [{ m, v: fsPreview(s, seat, m.card, m.from) ?? 1, free: m.from === 'rest' }]
      : [],
  )
  if (!options.length) return { t: 'pass' }
  // Rest-zone cards cost nothing: use them first.
  const free = options.filter((o) => o.free).sort((a, b) => b.v - a.v)
  if (free.length) return free[0].m
  const byValue = [...options].sort((a, b) => a.v - b.v)
  const winning = byValue.filter((o) => o.v > gap)
  if (winning.length) return winning[0].m
  const best = byValue[byValue.length - 1]
  // A tie denies the point: worth it once their total is locked, or in the last Engagement.
  const tying = byValue.find((o) => o.v === gap)
  if (tying && (theyLocked || last)) return tying.m
  const reserve = options.reduce((n, o) => n + o.v, 0)
  if (last && reserve >= gap) return best.m
  if (gap - best.v <= 1) return best.m
  return { t: 'pass' }
}
