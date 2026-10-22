import type { AsCard } from '../cards'
import { checkDeck } from '../deck'
import { fitModel } from '../deckgen/values'
import {
  analyzeView,
  deckStats,
  matrix,
  suggest,
  type DeckRow,
  type LabView,
  type Suggestion,
} from './analyze'
import {
  canBuild,
  coverageDecks,
  deckKey,
  optimalBuilds,
  randomPairings,
  roundRobin,
  suboptimalDecks,
  type Build,
} from './decks'
import { mergeSlices, type LabBot, type LabGame, type LabSlice, type LabSliceResult } from './play'

/**
 * The Balance lab: one run in three stages, with no decks to pick.
 * 1. Every card tested: random decks that hold every card about equally often
 *    play a league; a fit gives each card a value and a tier.
 * 2. Constructed: Optimal decks auto-built from those values (from many random
 *    parts of the pool, for pick rates) and Suboptimal ones play each other
 *    and the premades.
 * 3. Premades: the pack's own decks against each other, on both seats.
 * The core set (TFQ) is tested on its own, and as the baseline for the full pool.
 */

export interface LabOptions {
  games: number
  bot: LabBot
  seed: number
  /** Code prefixes of the core set, such as "TFQ". */
  core: string[]
}

export interface LabInput {
  packName: string
  cards: AsCard[]
  /** The pack's own decks (illegal ones are left out). */
  premades: { name: string; cards: string[] }[]
}

export type LabStage = 'cards' | 'constructed' | 'premades'
export const STAGE_NAMES: Record<LabStage, string> = {
  cards: 'Every card tested',
  constructed: 'Constructed check',
  premades: 'Premade matrix',
}

/** Play slices (in workers); a stopped run returns only the slices that finished. */
export type LabExec = (
  stage: LabStage,
  slices: LabSlice[],
) => Promise<(LabSliceResult | undefined)[]>

export interface LabResult {
  packName: string
  options: LabOptions
  startedAt: number
  seconds: number
  stopped: boolean
  cardCount: number
  coreCount: number
  /** Games played per stage. */
  played: Record<LabStage, number>
  decided: number
  firstWins: number
  rounds: number
  views: LabView[]
  premades: { decks: DeckRow[]; matrix: [number, number][][] } | null
  suggestions: Suggestion[]
  checked: number
  problems: string[]
}

/** The code prefix of a card ("TFQ" for "TFQ-01"). */
export const codePrefix = (c: AsCard) => /^[A-Za-z]+/.exec(c.code)?.[0]?.toUpperCase() ?? ''

/** Every code prefix in the pack, with its card count. */
export function prefixes(cards: AsCard[]) {
  const m = new Map<string, number>()
  for (const c of cards) m.set(codePrefix(c), (m.get(codePrefix(c)) ?? 0) + 1)
  return [...m].filter(([p]) => p).sort((a, b) => b[1] - a[1])
}

/** One in this many games goes through the rules checker. */
const CHECK_EVERY = 50
const OPTIMAL_BUILDS = 40
const FIELD_OPTIMAL = 8
const FIELD_SUBOPTIMAL = 4

const sliceSize = (bot: LabBot) => (bot === 'quick' ? 50 : 10)
const chunk = (games: LabGame[], n: number) => {
  const out: LabGame[][] = []
  for (let i = 0; i < games.length; i += n) out.push(games.slice(i, i + n))
  return out
}

/** Which views a run has (core set alone, full pool) and how its games are shared out. */
export function labPlan(input: LabInput, o: Pick<LabOptions, 'games' | 'core'>) {
  const { cards } = input
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
  const coreSet = new Set(o.core.map((p) => p.toUpperCase()))
  const coreCards = cards.filter((c) => coreSet.has(codePrefix(c)))
  const premades = input.premades.filter((d) => checkDeck(d.cards, byId).ok)
  type ViewSpec = { id: LabView['id']; title: string; cards: AsCard[]; share: number }
  const views: ViewSpec[] = []
  const coreOk = canBuild(coreCards)
  if (coreOk && coreCards.length === cards.length)
    views.push({ id: 'core', title: 'Core set', cards, share: 1 })
  else {
    if (coreOk) views.push({ id: 'core', title: 'Core set alone', cards: coreCards, share: 0.4 })
    views.push({
      id: 'full',
      title: coreOk ? 'Full pool, against the core set' : 'Full pool',
      cards,
      share: coreOk ? 0.6 : 1,
    })
  }
  const withPremades = premades.length >= 2
  const [s1, s2] = withPremades ? [0.6, 0.25] : [0.7, 0.3]
  const budget: Record<LabStage, number> = {
    cards: Math.round(o.games * s1),
    constructed: Math.round(o.games * s2),
    premades: 0,
  }
  budget.premades = withPremades ? o.games - budget.cards - budget.constructed : 0
  return { views, budget, premades: withPremades ? premades : [], coreCards }
}

export async function runLab(
  input: LabInput,
  o: LabOptions,
  exec: LabExec,
  stopped: () => boolean = () => false,
): Promise<LabResult> {
  const t0 = Date.now()
  const { cards } = input
  if (!canBuild(cards))
    throw new Error('The pack needs at least 12 cards (at most one Ace) for a deck.')
  const { views, budget, premades, coreCards } = labPlan(input, o)
  const coreIds = new Set(coreCards.map((c) => c.id))
  const withPremades = premades.length > 0

  const played: Record<LabStage, number> = { cards: 0, constructed: 0, premades: 0 }
  const all: LabSliceResult[] = []
  const play = async (stage: LabStage, slice: Omit<LabSlice, 'games'>, games: LabGame[]) => {
    const parts = await exec(
      stage,
      chunk(games, sliceSize(o.bot)).map((g) => ({ ...slice, games: g })),
    )
    const r = mergeSlices(parts.filter((p): p is LabSliceResult => !!p))
    played[stage] += r.games.length
    all.push(r)
    return r
  }

  // Stage 1: every card tested, per view.
  const leagues: {
    decks: string[][]
    league: LabSliceResult
    values: Record<string, number>
    bias: number
  }[] = []
  for (const [i, v] of views.entries()) {
    const games = Math.round(budget.cards * v.share)
    const n = Math.max(24, Math.min(400, Math.round(games / 25)))
    const decks = coverageDecks(v.cards, n, (o.seed + i * 101) >>> 0)
    const plan = randomPairings(decks.length, games, (o.seed * 31 + i) >>> 0, CHECK_EVERY)
    const league = stopped()
      ? mergeSlices([])
      : await play('cards', { cards: v.cards, decks, bot: o.bot }, plan)
    const fit = fitModel(
      v.cards.map((c) => c.id),
      decks,
      league.games,
    )
    leagues.push({ decks, league, values: fit.values, bias: fit.bias })
  }

  // Stage 2: constructed, per view.
  const built: {
    builds: Build[]
    decks: Pick<DeckRow, 'name' | 'kind' | 'cards'>[]
    games: LabSliceResult
  }[] = []
  for (const [i, v] of views.entries()) {
    const { values } = leagues[i]
    const builds = optimalBuilds(v.cards, values, OPTIMAL_BUILDS, (o.seed * 7 + i) >>> 0)
    const seen = new Set<string>()
    const field: Pick<DeckRow, 'name' | 'kind' | 'cards'>[] = []
    for (const b of builds) {
      if (field.length >= FIELD_OPTIMAL) break
      if (seen.has(deckKey(b.cards))) continue
      seen.add(deckKey(b.cards))
      field.push({ name: `Optimal ${field.length + 1}`, kind: 'optimal', cards: b.cards })
    }
    suboptimalDecks(v.cards, values, FIELD_SUBOPTIMAL, (o.seed * 13 + i) >>> 0).forEach((d, k) =>
      field.push({ name: `Suboptimal ${k + 1}`, kind: 'suboptimal', cards: d }),
    )
    const ids = new Set(v.cards.map((c) => c.id))
    for (const p of premades)
      if (p.cards.every((id) => ids.has(id)))
        field.push({ name: p.name, kind: 'premade', cards: p.cards })
    const games = Math.round(budget.constructed * v.share)
    const plan = randomPairings(field.length, games, (o.seed * 17 + i) >>> 0, CHECK_EVERY)
    const r = stopped()
      ? mergeSlices([])
      : await play(
          'constructed',
          { cards: v.cards, decks: field.map((d) => d.cards), bot: o.bot },
          plan,
        )
    built.push({ builds, decks: field, games: r })
  }

  // Stage 3: the premade matrix.
  let premadeResult: LabResult['premades'] = null
  if (withPremades) {
    const plan = roundRobin(premades.length, budget.premades, (o.seed * 19) >>> 0, CHECK_EVERY)
    const r = stopped()
      ? mergeSlices([])
      : await play('premades', { cards, decks: premades.map((p) => p.cards), bot: o.bot }, plan)
    const st = deckStats(premades.length, r.games)
    premadeResult = {
      decks: premades.map((p, k) => ({ name: p.name, kind: 'premade', cards: p.cards, ...st[k] })),
      matrix: matrix(premades.length, r.games) as [number, number][][],
    }
  }

  const labViews = views.map((v, i) =>
    analyzeView({
      id: v.id,
      title: v.title,
      cards: v.cards,
      coreIds,
      decks: leagues[i].decks,
      league: leagues[i].league,
      values: leagues[i].values,
      bias: leagues[i].bias,
      builds: built[i].builds,
      constructed: { decks: built[i].decks, games: built[i].games },
    }),
  )
  const merged = mergeSlices(all)
  const decided = merged.games.filter((g) => g.winner !== null)
  return {
    packName: input.packName,
    options: o,
    startedAt: t0,
    seconds: (Date.now() - t0) / 1000,
    stopped: stopped(),
    cardCount: cards.length,
    coreCount: coreCards.length,
    played,
    decided: decided.length,
    firstWins: decided.filter((g) => g.winner === g.first).length,
    rounds: merged.games.reduce((a, g) => a + g.rounds, 0),
    views: labViews,
    premades: premadeResult,
    suggestions: suggest(labViews, cards),
    checked: merged.checked,
    problems: merged.problems.slice(0, 50),
  }
}
