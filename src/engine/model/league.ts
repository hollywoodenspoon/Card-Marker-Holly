/**
 * The league: everything about the game's competitive world, as editable data.
 * Levels of duelists, tournaments (composable stages, points, invites, prizes),
 * card releases, the ban list, the card market and the world step. Nothing here is
 * a rule of the engine: `adventureLeague()` is only the first game's starting
 * values, and every number, name and schedule can be changed in the editor.
 * Pure data and small helpers, no UI.
 */
import { newId } from '@/core/model/ids'

export type BotName = 'easy' | 'normal' | 'hard'

/** A tier of duelists (local, regional, national, pro…), lowest first. */
export interface Level {
  id: string
  name: string
  /** A duelist is at this level from this rating up. */
  minRating: number
  /** How many generated duelists live at this level when the game starts. */
  population: number
  /** How strongly the table's bot plays for duelists here. */
  bot: BotName
}

export type StageKind = 'roundRobin' | 'swiss' | 'groups' | 'single' | 'double'

/** One stage of a tournament. Stages chain: the first `advance` of a stage go on. */
export interface StageDef {
  id: string
  kind: StageKind
  /** Games per match (odd). */
  bestOf: number
  /** The final's games, when it differs (knockout stages). */
  finalBestOf: number | null
  /** Swiss: rounds. Groups: how many groups. */
  rounds: number
  /** How many go on from this stage to the next one (0: all, or the end). */
  advance: number
}

export type Entry =
  | { kind: 'open' }
  /** Needs this many points on a track. `chance` % of those who qualify are invited. */
  | { kind: 'points'; track: string; points: number; chance: number }

export interface TournamentDef {
  id: string
  name: string
  players: number
  stages: StageDef[]
  /** How likely duelists of each level are to be in the field (weights; 0 or missing: never). */
  field: Record<string, number>
  /** Whether only duelists from the player's region can come, or anyone. */
  region: 'home' | 'any'
  entry: Entry
  /** Points by place (1st first) on a track. */
  track: string | null
  pointsByPlace: number[]
  /** Prize money for the whole pool, split by percent over the first places. */
  prizePool: number
  prizeSplit: number[]
  /** Whether bans look at this tournament's results. */
  watchForBans: boolean
}

/** A points ladder ("Circuit points"). */
export interface Track {
  id: string
  name: string
  /** Points fade: they are multiplied by (100 − this)% each year. 0: they stay. */
  yearlyDecay: number
}

/** How a release picks its cards. */
export interface ReleaseDef {
  id: string
  name: string
  /** Cards always in this release. */
  fixed: string[]
  /** How many more are drawn at random. */
  random: number
  /** The card field the random cards are related by ("" : not related). */
  relatedBy: string
  /** 0–100: chance each next card shares the related field with the one before. */
  relatedChance: number
  /** Only cards whose field contains the text (both empty: any card). */
  onlyField: string
  onlyText: string
}

export interface BanRules {
  enabled: boolean
  /** The most cards one update bans. */
  perUpdate: number
  /** Weeks between the announcement and the ban coming into force. */
  announceWeeks: number
  /** The share of top finishers' decks a card must appear in to be a candidate (percent). */
  minShare: number
  /** How many top finishers of each watched tournament count. */
  topPlacings: number
  /** Cards the designer bans or unbans by hand, in the next update. */
  handBanned: string[]
}

export interface MarketRules {
  enabled: boolean
  /** Base price of one copy by rarity. */
  base: Record<'common' | 'uncommon' | 'rare' | 'diamond', number>
  /** How much use in top decks lifts the price (0 = not at all). */
  demand: number
  /** How much a scarce card lifts the price. */
  scarcity: number
  /** Price limits as multiples of the base price. */
  minMult: number
  maxMult: number
  /** Booster supply: boxes (of `perBox` boosters) each store receives per month. */
  booster: string | null
  boxesPerMonth: number
  perBox: number
  stores: number
  countries: number
}

export interface Names {
  first: string[]
  last: string[]
  regions: string[]
}

export interface League {
  enabled: boolean
  levels: Level[]
  tracks: Track[]
  tournaments: TournamentDef[]
  releases: ReleaseDef[]
  bans: BanRules
  market: MarketRules
  names: Names
  /** The player's starting rating, and how fast ratings move after a match. */
  playerRating: number
  ratingStep: number
  /** Cards in a deck for generated duelists. */
  npcDeckSize: number
  /** Rating drift per week for every duelist (a little random movement). */
  weeklyDrift: number
}

export const newLevel = (name: string, minRating: number, population = 20): Level => ({
  id: newId(),
  name,
  minRating,
  population,
  bot: 'normal',
})

export const newStage = (kind: StageKind = 'swiss'): StageDef => ({
  id: newId(),
  kind,
  bestOf: 1,
  finalBestOf: null,
  rounds: 3,
  advance: 0,
})

export const newTournament = (name: string, levels: Level[]): TournamentDef => ({
  id: newId(),
  name,
  players: 8,
  stages: [newStage('roundRobin')],
  field: Object.fromEntries(levels.slice(0, 1).map((l) => [l.id, 1])),
  region: 'home',
  entry: { kind: 'open' },
  track: null,
  pointsByPlace: [],
  prizePool: 0,
  prizeSplit: [50, 30, 20],
  watchForBans: false,
})

export const newTrack = (name: string): Track => ({ id: newId(), name, yearlyDecay: 0 })

export const newRelease = (name: string): ReleaseDef => ({
  id: newId(),
  name,
  fixed: [],
  random: 6,
  relatedBy: '',
  relatedChance: 60,
  onlyField: '',
  onlyText: '',
})

export const defaultNames = (): Names => ({
  first: ['Alex', 'Bea', 'Cato', 'Dara', 'Eli', 'Faye', 'Gus', 'Hana', 'Ivo', 'Jun', 'Kit', 'Lena', 'Milo', 'Nia', 'Otto', 'Pia'],
  last: ['Stone', 'Reed', 'Fox', 'Vale', 'Marsh', 'Crow', 'Hale', 'Quill', 'Rowe', 'Thorn', 'Wick', 'Yarrow'],
  regions: ['North', 'South', 'East', 'West'],
})

export const defaultBans = (): BanRules => ({
  enabled: false,
  perUpdate: 2,
  announceWeeks: 4,
  minShare: 30,
  topPlacings: 8,
  handBanned: [],
})

export const defaultMarket = (): MarketRules => ({
  enabled: false,
  base: { common: 1, uncommon: 3, rare: 6, diamond: 20 },
  demand: 2,
  scarcity: 1,
  minMult: 0.5,
  maxMult: 5,
  booster: null,
  boxesPerMonth: 10,
  perBox: 12,
  stores: 100,
  countries: 5,
})

/** An empty league: nothing set up, nothing running. */
export const emptyLeague = (): League => ({
  enabled: false,
  levels: [],
  tracks: [],
  tournaments: [],
  releases: [],
  bans: defaultBans(),
  market: defaultMarket(),
  names: defaultNames(),
  playerRating: 1000,
  ratingStep: 24,
  npcDeckSize: 30,
  weeklyDrift: 4,
})

/**
 * The first game's starting values (Adventure Scuffle!): four levels, a circuit
 * of Locals → Regionals → Nationals → Pro Tour → Worlds, 50/30/20 prizes and a
 * ban list of two cards from year 2. Only a starting point; a new game can start
 * from it with one button, then change everything.
 */
export function adventureLeague(): League {
  const levels = [
    { ...newLevel('Local', 0, 70), bot: 'easy' as const },
    { ...newLevel('Regional', 1050, 30), bot: 'normal' as const },
    { ...newLevel('National', 1150, 15), bot: 'hard' as const },
    { ...newLevel('Pro', 1250, 8), bot: 'hard' as const },
  ]
  const [loc, reg, nat, pro] = levels.map((l) => l.id)
  const circuit = newTrack('Circuit points')
  const stage = (kind: StageKind, o: Partial<StageDef> = {}): StageDef => ({
    ...newStage(kind),
    ...o,
  })
  const t = (name: string, o: Partial<TournamentDef>): TournamentDef => ({
    ...newTournament(name, levels),
    ...o,
  })
  const tournaments: TournamentDef[] = [
    t('Locals', {
      players: 8,
      stages: [stage('roundRobin')],
      field: { [loc]: 10, [reg]: 1 },
      track: circuit.id,
      pointsByPlace: [3, 2, 1],
    }),
    t('Regionals', {
      players: 16,
      stages: [stage('swiss', { rounds: 3, advance: 4 }), stage('single')],
      field: { [loc]: 6, [reg]: 6, [nat]: 1 },
      track: circuit.id,
      pointsByPlace: [10, 6, 4, 4],
    }),
    t('Nationals', {
      players: 32,
      stages: [stage('swiss', { rounds: 5, advance: 8 }), stage('single')],
      field: { [loc]: 1, [reg]: 6, [nat]: 8, [pro]: 1 },
      track: circuit.id,
      pointsByPlace: [30, 20, 14, 14, 8, 8, 8, 8],
      prizePool: 1000,
      watchForBans: true,
    }),
    t('Pro Tour', {
      players: 16,
      region: 'any',
      stages: [
        stage('groups', { bestOf: 3, rounds: 4, advance: 1 }),
        stage('single', { bestOf: 3, finalBestOf: 5 }),
      ],
      field: { [nat]: 4, [pro]: 8 },
      entry: { kind: 'points', track: circuit.id, points: 60, chance: 100 },
      track: circuit.id,
      pointsByPlace: [40, 25, 15, 15],
      prizePool: 5000,
      watchForBans: true,
    }),
    t('World Championship', {
      players: 16,
      region: 'any',
      stages: [
        stage('groups', { bestOf: 3, rounds: 2, advance: 4 }),
        stage('double', { bestOf: 3, finalBestOf: 5 }),
      ],
      field: { [nat]: 1, [pro]: 10 },
      entry: { kind: 'points', track: circuit.id, points: 120, chance: 100 },
      prizePool: 20000,
      watchForBans: true,
    }),
  ]
  return {
    ...emptyLeague(),
    enabled: true,
    levels,
    tracks: [circuit],
    tournaments,
    releases: [
      { ...newRelease('Starter set'), random: 15 },
      { ...newRelease('Season release'), random: 6 },
    ],
    bans: { ...defaultBans(), enabled: true },
    market: { ...defaultMarket(), enabled: true },
  }
}

const arr = <T>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d)

/** Fill anything an older or hand-edited game lacks. */
export function tidyLeague(raw: Partial<League> | undefined): League {
  const d = emptyLeague()
  const r = raw ?? {}
  const tidyStage = (s: Partial<StageDef>): StageDef => ({
    ...newStage(s.kind ?? 'swiss'),
    ...s,
    id: s.id || newId(),
  })
  return {
    ...d,
    ...r,
    enabled: !!r.enabled,
    levels: arr(r.levels, d.levels),
    tracks: arr(r.tracks, d.tracks),
    tournaments: arr<TournamentDef>(r.tournaments, []).map((t) => ({
      ...newTournament(t.name ?? 'Tournament', []),
      ...t,
      stages: arr<StageDef>(t.stages, []).map(tidyStage),
      field: t.field && typeof t.field === 'object' ? t.field : {},
      pointsByPlace: arr(t.pointsByPlace, []),
      prizeSplit: arr(t.prizeSplit, [50, 30, 20]),
    })),
    releases: arr(r.releases, d.releases),
    bans: { ...d.bans, ...(r.bans ?? {}), handBanned: arr(r.bans?.handBanned, []) },
    market: {
      ...d.market,
      ...(r.market ?? {}),
      base: { ...d.market.base, ...(r.market?.base ?? {}) },
    },
    names: {
      first: arr(r.names?.first, d.names.first),
      last: arr(r.names?.last, d.names.last),
      regions: arr(r.names?.regions, d.names.regions),
    },
  }
}

export const levelOf = (l: League, rating: number): Level | null => {
  let best: Level | null = null
  for (const lv of [...l.levels].sort((a, b) => a.minRating - b.minRating))
    if (rating >= lv.minRating) best = lv
  return best ?? l.levels[0] ?? null
}
