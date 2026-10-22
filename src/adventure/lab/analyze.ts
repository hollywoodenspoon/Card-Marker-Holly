import type { AsCard } from '../cards'
import type { Values } from '../deckgen/build'
import type { Build } from './decks'
import type { LabGameResult, LabSliceResult } from './play'

/**
 * What the Balance lab's games say: card values and tiers, play rates, the
 * core set as the baseline for every other card, and ranked suggestions.
 * Pure: the games are played elsewhere (in workers).
 */

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'
/** Too weak, healthy or too strong. */
export type Band = 'weak' | 'ok' | 'strong'

export interface CardRow {
  id: string
  name: string
  code: string
  core: boolean
  /** Log-odds of winning a card adds to a deck (0 is an average card in this view). */
  value: number
  tier: Tier
  /** League games of decks holding it, and their wins. */
  games: number
  wins: number
  /** Fighting Spirit reveals and ability uses per game it was in. */
  fs: number
  abilities: number
  /** Optimal builds that picked it, out of those it could be picked in. */
  picks: number
  available: number
  band: Band
  /** Full pool: the core card it's closest to (same type, nearest stats). */
  closest?: { id: string; name: string; value: number }
  /** Full pool: it clearly outclasses the core set (power creep). */
  creep?: boolean
}

export type DeckKind = 'optimal' | 'suboptimal' | 'premade'

export interface DeckRow {
  name: string
  kind: DeckKind
  cards: string[]
  games: number
  wins: number
  /** Games and wins as the player with the first initiative. */
  firstGames: number
  firstWins: number
  rounds: number
}

export interface PairRow {
  a: string
  b: string
  /** League decks holding both, and their games. */
  decks: number
  games: number
  /** Wins per game above what the two cards' values predict. */
  over: number
  /** Optimal builds holding both, out of those that could. */
  together: number
  both: number
}

export interface LabView {
  id: 'core' | 'full'
  title: string
  cards: CardRow[]
  /** League: decks and games played. */
  decks: number
  games: number
  constructed: { decks: DeckRow[]; games: number }
  /** Card pairs that win far more together than apart. */
  pairs: PairRow[]
  /** Full pool: the core cards' values (10th and 90th percentile, and the top). */
  coreRange?: { low: number; high: number; max: number }
}

export interface Suggestion {
  /** 1: core set; 2: breaks the game in the full pool; 3: the rest. */
  rank: 1 | 2 | 3
  kind: 'strong' | 'weak' | 'creep' | 'combo' | 'deck'
  view: LabView['id']
  cards: string[]
  text: string
  options: string[]
}

export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']
/** Share of cards per tier, best first. */
const TIER_SHARE = [0.1, 0.2, 0.4, 0.2, 0.1]

/** Picked into at least this share of the Optimal builds it could go in: a must-play. */
export const MUST_PLAY = 0.85
/** Picked into at most this share: nobody plays it. */
export const NEVER_PLAYED = 0.05
/** Builds a card must be available in before its pick rate counts. */
const MIN_AVAILABLE = 8

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))
export const meanSd = (v: number[]) => {
  const mean = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, v.length))
  return { mean, sd: sd || 1e-6 }
}
const quantile = (sorted: number[], q: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0

/** Tiers by rank: the top 10% S, the next 20% A, the middle 40% B, then C and D. */
export function tiers(values: Values): Record<string, Tier> {
  const ids = Object.keys(values).sort((a, b) => values[b] - values[a])
  const out: Record<string, Tier> = {}
  let at = 0
  TIER_SHARE.forEach((share, t) => {
    const end = t === TIERS.length - 1 ? ids.length : at + Math.round(share * ids.length)
    for (; at < end && at < ids.length; at++) out[ids[at]] = TIERS[t]
  })
  return out
}

/** Games and wins per deck, as each seat and as the first player. */
export function deckStats(n: number, games: LabGameResult[]) {
  const rows = Array.from({ length: n }, () => ({
    games: 0,
    wins: 0,
    firstGames: 0,
    firstWins: 0,
    rounds: 0,
  }))
  for (const g of games)
    for (const seat of [0, 1] as const) {
      const d = rows[seat === 0 ? g.a : g.b]
      d.games++
      d.rounds += g.rounds
      if (g.winner === seat) d.wins++
      if (g.first === seat) {
        d.firstGames++
        if (g.winner === seat) d.firstWins++
      }
    }
  return rows
}

/** Win rate of each row deck against each column deck: [wins, games]. */
export function matrix(n: number, games: LabGameResult[]) {
  const m = Array.from({ length: n }, () => Array.from({ length: n }, () => [0, 0]))
  for (const g of games) {
    m[g.a][g.b][1]++
    m[g.b][g.a][1]++
    if (g.winner === 0) m[g.a][g.b][0]++
    if (g.winner === 1) m[g.b][g.a][0]++
  }
  return m
}

/** The card a new card is closest to among the core set: same type, nearest stats. */
function closestCore(c: AsCard, core: AsCard[]) {
  const dist = (o: AsCard) =>
    (o.type === c.type ? 0 : 10) + Math.abs(o.fs - c.fs) + Math.abs(o.a - c.a) + Math.abs(o.d - c.d)
  return [...core].sort((x, y) => dist(x) - dist(y))[0]
}

export interface ViewInput {
  id: LabView['id']
  title: string
  cards: AsCard[]
  coreIds: Set<string>
  decks: string[][]
  league: LabSliceResult
  values: Values
  bias: number
  builds: Build[]
  constructed: { decks: Pick<DeckRow, 'name' | 'kind' | 'cards'>[]; games: LabSliceResult }
}

export function analyzeView(v: ViewInput): LabView {
  const ids = v.cards.map((c) => c.id)
  const tier = tiers(Object.fromEntries(ids.map((id) => [id, v.values[id] ?? 0])))
  const { mean, sd } = meanSd(ids.map((id) => v.values[id] ?? 0))
  // Games and wins of the decks each card is in.
  const per = new Map(ids.map((id) => [id, { games: 0, wins: 0 }]))
  const stats = deckStats(v.decks.length, v.league.games)
  v.decks.forEach((d, i) => {
    for (const id of d) {
      const p = per.get(id)
      if (!p) continue
      p.games += stats[i].games
      p.wins += stats[i].wins
    }
  })
  const picks = new Map(ids.map((id) => [id, [0, 0]]))
  for (const b of v.builds) {
    for (const id of b.pool) {
      const p = picks.get(id)
      if (p) p[1]++
    }
    for (const id of b.cards) {
      const p = picks.get(id)
      if (p) p[0]++
    }
  }
  const core = v.cards.filter((c) => v.coreIds.has(c.id))
  const coreVals = core.map((c) => v.values[c.id] ?? 0).sort((a, b) => a - b)
  const withNew = v.id === 'full' && core.length > 0 && core.length < v.cards.length
  const coreRange = withNew
    ? { low: quantile(coreVals, 0.1), high: quantile(coreVals, 0.9), max: coreVals.at(-1)! }
    : undefined
  const cards: CardRow[] = v.cards.map((c) => {
    const value = v.values[c.id] ?? 0
    const p = per.get(c.id)!
    const [pk, av] = picks.get(c.id)!
    const u = v.league.uses[c.id] ?? [0, 0]
    const rate = av >= MIN_AVAILABLE ? pk / av : null
    // Only outliers clear of the noise: about 2 standard errors from the mean.
    const clear = Math.abs(value - mean) >= 4 / Math.sqrt(Math.max(1, p.games))
    const band: Band = !clear
      ? 'ok'
      : value >= mean + 2.5 * sd || (value >= mean + 1.5 * sd && rate !== null && rate >= MUST_PLAY)
        ? 'strong'
        : value <= mean - 2.5 * sd ||
            (value <= mean - 1.5 * sd && rate !== null && rate <= NEVER_PLAYED)
          ? 'weak'
          : 'ok'
    const row: CardRow = {
      id: c.id,
      name: c.name,
      code: c.code,
      core: v.coreIds.has(c.id),
      value,
      tier: tier[c.id],
      games: p.games,
      wins: p.wins,
      fs: p.games ? u[0] / p.games : 0,
      abilities: p.games ? u[1] / p.games : 0,
      picks: pk,
      available: av,
      band,
    }
    if (coreRange && !row.core) {
      const near = closestCore(c, core)
      const nv = v.values[near.id] ?? 0
      row.closest = { id: near.id, name: near.name, value: nv }
      row.creep = clear && value > coreRange.high && value - nv > 0.5 * sd
    }
    return row
  })
  const cstats = deckStats(v.constructed.decks.length, v.constructed.games.games)
  return {
    id: v.id,
    title: v.title,
    cards: cards.sort((a, b) => b.value - a.value),
    decks: v.decks.length,
    games: v.league.games.length,
    constructed: {
      decks: v.constructed.decks.map((d, i) => ({ ...d, ...cstats[i] })),
      games: v.constructed.games.games.length,
    },
    pairs: pairs(v, withNew),
    coreRange,
  }
}

/**
 * Pairs that win far above what their values add up to: each league deck's
 * wins above the fit's prediction, added up over the decks holding both cards.
 * Full pool: only a core card with a new card.
 */
function pairs(v: ViewInput, coreWithNew: boolean): PairRow[] {
  const val = (d: string[]) => d.reduce((a, id) => a + (v.values[id] ?? 0), 0)
  const score = v.decks.map(val)
  const over = v.decks.map(() => ({ games: 0, over: 0 }))
  for (const g of v.league.games) {
    if (g.winner === null) continue
    const p = sigmoid(v.bias + score[g.a] - score[g.b])
    over[g.a].games++
    over[g.b].games++
    over[g.a].over += (g.winner === 0 ? 1 : 0) - p
    over[g.b].over += (g.winner === 1 ? 1 : 0) - (1 - p)
  }
  const acc = new Map<string, { decks: number; games: number; over: number }>()
  const ok = (a: string, b: string) => !coreWithNew || v.coreIds.has(a) !== v.coreIds.has(b)
  v.decks.forEach((d, i) => {
    const s = [...d].sort()
    for (let x = 0; x < s.length; x++)
      for (let y = x + 1; y < s.length; y++) {
        if (!ok(s[x], s[y])) continue
        const k = `${s[x]}|${s[y]}`
        const e = acc.get(k) ?? { decks: 0, games: 0, over: 0 }
        e.decks++
        e.games += over[i].games
        e.over += over[i].over
        acc.set(k, e)
      }
  })
  const out: PairRow[] = []
  for (const [k, e] of acc) {
    if (e.decks < 3 || e.games < 30 || e.over / e.games < 0.1) continue
    const [a, b] = k.split('|')
    let together = 0
    let both = 0
    for (const bd of v.builds) {
      if (!bd.pool.includes(a) || !bd.pool.includes(b)) continue
      both++
      if (bd.cards.includes(a) && bd.cards.includes(b)) together++
    }
    out.push({ a, b, decks: e.decks, games: e.games, over: e.over / e.games, together, both })
  }
  return out.sort((x, y) => y.over - x.over).slice(0, 8)
}

const name = (rows: CardRow[], id: string) => rows.find((r) => r.id === id)?.name ?? id
const pct = (x: number) => `${Math.round(100 * x)}%`

/** Stat and text options for a card that's too strong or too weak. */
export function options(c: AsCard, dir: 'down' | 'up'): string[] {
  const out: string[] = []
  if (dir === 'down') {
    if (c.a > 0) out.push(`Stats: Attack ${c.a} → ${c.a - 1}.`)
    if (c.d > 0) out.push(`Stats: Defense ${c.d} → ${c.d - 1}.`)
    if (c.fs > 1) out.push(`Stats: Fighting Spirit ${c.fs} → ${c.fs - 1}.`)
    if (c.ability) out.push('Text: a smaller number, a stricter condition, or once per round.')
  } else {
    out.push(`Stats: Attack ${c.a} → ${c.a + 1}.`, `Stats: Defense ${c.d} → ${c.d + 1}.`)
    if (c.fs < 3) out.push(`Stats: Fighting Spirit ${c.fs} → ${c.fs + 1}.`)
    out.push(
      c.ability ? 'Text: a bigger number or an easier condition.' : 'Text: give it an ability.',
    )
  }
  return out
}

/**
 * Ranked suggestions: the core set first (it's printed first), then what
 * breaks the game once the new cards arrive, then the rest.
 */
export function suggest(views: LabView[], cards: AsCard[]): Suggestion[] {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
  const out: Suggestion[] = []
  const hasCoreView = views.some((v) => v.id === 'core')
  for (const v of views) {
    for (const r of v.cards) {
      // The core view speaks for core cards; the full view for the new ones.
      if (hasCoreView && v.id === 'full' && r.core) continue
      const c = byId[r.id]
      const rate = r.available ? r.picks / r.available : 0
      const why = `value ${r.value.toFixed(2)} (tier ${r.tier}), in ${pct(rate)} of the Optimal decks it could go in, ${pct(r.games ? r.wins / r.games : 0)} wins with it`
      if (r.creep) {
        out.push({
          rank: 2,
          kind: 'creep',
          view: v.id,
          cards: [r.id],
          text: `${r.name} outclasses the core set: ${why}. Closest core card: ${r.closest!.name} (${r.closest!.value.toFixed(2)}).`,
          options: options(c, 'down'),
        })
      } else if (r.band === 'strong')
        out.push({
          rank: r.core ? 1 : 2,
          kind: 'strong',
          view: v.id,
          cards: [r.id],
          text: `${r.name} looks too strong: ${why}.`,
          options: options(c, 'down'),
        })
      else if (r.band === 'weak')
        out.push({
          rank: r.core ? 1 : 3,
          kind: 'weak',
          view: v.id,
          cards: [r.id],
          text: `${r.name} looks too weak: ${why}.`,
          options: options(c, 'up'),
        })
    }
    for (const p of v.pairs) {
      const [a, b] = [byId[p.a], byId[p.b]]
      // Full pool: one core card and one new; the new one is the one to change.
      const newOne = v.id === 'full' ? (v.cards.find((r) => r.id === p.a)?.core ? b : a) : null
      out.push({
        rank: v.id === 'core' ? 1 : 2,
        kind: 'combo',
        view: v.id,
        cards: [p.a, p.b],
        text: `${name(v.cards, p.a)} with ${name(v.cards, p.b)} wins ${pct(p.over)} more games than their values predict (${p.decks} decks, ${p.games} games${p.both ? `; together in ${p.together} of ${p.both} Optimal builds that could hold both` : ''}).`,
        options: newOne
          ? [
              `Change the new card, ${newOne.name}, not the core card: a stricter condition, or a stat −1.`,
              'Or check the two cards’ text: one may trigger the other more often than meant.',
            ]
          : [
              'Look at what each one does for the other: soften one side of the combo (a stricter condition, or a stat −1).',
            ],
      })
    }
    for (const d of v.constructed.decks) {
      if (d.kind !== 'optimal' || d.games < 40 || d.wins / d.games < 0.7) continue
      const top = d.cards
        .map((id) => v.cards.find((r) => r.id === id))
        .filter((r): r is CardRow => !!r)
        .sort((x, y) => y.value - x.value)
        .slice(0, 3)
      out.push({
        rank:
          v.id === 'core' || d.cards.every((id) => v.cards.find((r) => r.id === id)?.core) ? 1 : 2,
        kind: 'deck',
        view: v.id,
        cards: d.cards,
        text: `${d.name} (${v.title}) won ${pct(d.wins / d.games)} of ${d.games} games against the other decks.`,
        options: [
          `Its strongest cards: ${top.map((r) => r.name).join(', ')}. Start with any of them flagged above.`,
        ],
      })
    }
  }
  const kindOrder = { creep: 0, strong: 1, combo: 2, deck: 3, weak: 4 }
  return out.sort((a, b) => a.rank - b.rank || kindOrder[a.kind] - kindOrder[b.kind])
}

/** Cards whose ability almost never came up (an Inherent's always-on text isn't counted). */
export function rarelyUsed(v: LabView, cards: AsCard[]) {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
  return v.cards.filter(
    (r) =>
      byId[r.id]?.ability && byId[r.id].type !== 'Inherent' && r.games >= 20 && r.abilities < 0.03,
  )
}
