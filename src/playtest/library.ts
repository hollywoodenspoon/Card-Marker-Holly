import Dexie, { type EntityTable } from 'dexie'
import type { BotLevel } from '@/adventure/bot'
import type { Move, NewGame } from '@/adventure/engine'
import type { AsState, Seat } from '@/adventure/state'
import { readPack, type PackInfo } from './pack'
import type { GameSetup } from './setup'
import type { TableState } from './state'

/**
 * The Playtest app's own database (separate from Hearthside Cardworks' projects).
 * Both apps are served from the same site, so Hearthside Cardworks' "Playtest now"
 * can put a pack here and open the Playtest app on it.
 */
export interface PackRow {
  /** The Hearthside Cardworks project id: a newer export of the same project replaces the old one. */
  id: string
  name: string
  importedAt: number
  cardCount: number
  file: Blob
}

/** The game in progress for a pack. */
export interface GameRow {
  packId: string
  setup: GameSetup
  state: TableState
  past: TableState[]
  /** Adventure Scuffle with the rules on: the rules state (the table is drawn from it). */
  rules?: {
    state: AsState
    past: AsState[]
    viewer: number | null
    /** The bot level per seat (null: a person). */
    bots?: [BotLevel | null, BotLevel | null]
    /** How the game began, and its moves (one group per play), for its replay. */
    game?: NewGame
    moves?: Move[][]
  }
  savedAt: number
}

/** A deck built in the Playtest app (one copy per card id listed). */
export interface DeckRow {
  id: string
  packId: string
  name: string
  cards: string[]
  updatedAt: number
}

/** A finished (or abandoned) rules game, kept to watch again. */
export interface ReplayRow {
  id: string
  packId: string
  savedAt: number
  source: 'play' | 'bot' | 'rush'
  names: [string, string]
  /** Deck names, when known. */
  decks?: [string, string]
  bots: [BotLevel | null, BotLevel | null]
  winner: Seat | null
  points: [number, number]
  rounds: number
  /** The engine is deterministic: the start and the moves are the whole game. */
  game: NewGame
  moves: Move[]
  /** Pinned replays are never pruned. */
  pinned: boolean
}

/** One match of a Rush batch (its cards and decks are the batch's). */
export interface RushMatch {
  seed: number
  /** Which deck each seat played (index into the batch's decks), and the levels. */
  seats: [0 | 1, 0 | 1]
  levels: [BotLevel, BotLevel]
  moves: Move[]
  winner: Seat | null
  /** Who had the initiative in round 1. */
  first: Seat
  points: [number, number]
  rounds: number
  problem?: string
}

/** A Rush batch: many bot games, with their tally (the sim result) and every match. */
export interface RushRow {
  id: string
  packId: string
  savedAt: number
  decks: [{ name: string; cards: string[] }, { name: string; cards: string[] }]
  levels: [BotLevel, BotLevel]
  games: number
  cards: NewGame['cards']
  /** Times each card was used, per deck: `deck:cardId` → [Fighting Spirit, abilities]. */
  uses: Record<string, [number, number]>
  matches: RushMatch[]
  /** The batch was stopped before all its games were played. */
  stopped?: boolean
}

/** Replays kept per pack (pinned ones come on top). */
export const REPLAYS_KEPT = 100
/** Rush batches kept per pack. */
export const RUSH_KEPT = 5

/** Card values for the deck auto-builder, per pack and card data (see deckgen/values.ts). */
export interface CardValuesRow {
  /** `packId:hash`, the hash of the cards' rule values. */
  key: string
  packId: string
  values: Record<string, number>
  games: number
  savedAt: number
}

export interface SetupRow {
  id: string
  setup: GameSetup
}

export class PlaytestDB extends Dexie {
  packs!: EntityTable<PackRow, 'id'>
  games!: EntityTable<GameRow, 'packId'>
  setups!: EntityTable<SetupRow, 'id'>
  decks!: EntityTable<DeckRow, 'id'>
  replays!: EntityTable<ReplayRow, 'id'>
  rush!: EntityTable<RushRow, 'id'>
  cardValues!: EntityTable<CardValuesRow, 'key'>

  constructor(name = 'card-maker-playtest') {
    super(name)
    this.version(1).stores({ packs: 'id, importedAt', games: 'packId', setups: 'id' })
    this.version(2).stores({ decks: 'id, packId' })
    this.version(3).stores({ replays: 'id, packId, savedAt', rush: 'id, packId, savedAt' })
    this.version(4).stores({ cardValues: 'key, packId' })
  }
}

let shared: PlaytestDB | undefined
export const playtestDb = () => (shared ??= new PlaytestDB())

/** Check a pack file and store it (replacing an older export of the same project). */
export async function addPack(bytes: Uint8Array, db = playtestDb()): Promise<PackInfo> {
  const { info } = readPack(bytes)
  await db.packs.put({
    id: info.projectId,
    name: info.name,
    importedAt: Date.now(),
    cardCount: info.cards.length,
    file: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
  })
  return info
}

/** Decks built for a pack, newest change first. */
export async function listDecks(packId: string, db = playtestDb()): Promise<DeckRow[]> {
  const rows = await db.decks.where('packId').equals(packId).toArray()
  return rows.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveDeck(
  deck: Omit<DeckRow, 'updatedAt'>,
  db = playtestDb(),
): Promise<DeckRow> {
  const row = { ...deck, updatedAt: Date.now() }
  await db.decks.put(row)
  return row
}

export const deleteDeck = (id: string, db = playtestDb()) => db.decks.delete(id)

/** Replays of a pack, newest first. */
export async function listReplays(packId: string, db = playtestDb()): Promise<ReplayRow[]> {
  const rows = await db.replays.where('packId').equals(packId).toArray()
  return rows.sort((a, b) => b.savedAt - a.savedAt)
}

/** Keep a replay, then drop the oldest unpinned ones beyond `REPLAYS_KEPT`. */
export async function saveReplay(
  row: Omit<ReplayRow, 'savedAt' | 'pinned'> & { pinned?: boolean },
  db = playtestDb(),
): Promise<ReplayRow> {
  const full: ReplayRow = { pinned: false, ...row, savedAt: Date.now() }
  await db.replays.put(full)
  const extra = (await listReplays(row.packId, db)).filter((r) => !r.pinned).slice(REPLAYS_KEPT)
  if (extra.length) await db.replays.bulkDelete(extra.map((r) => r.id))
  return full
}

export const pinReplay = (id: string, pinned: boolean, db = playtestDb()) =>
  db.replays.update(id, { pinned })

export const deleteReplay = (id: string, db = playtestDb()) => db.replays.delete(id)

/** Rush batches of a pack, newest first. */
export async function listRush(packId: string, db = playtestDb()): Promise<RushRow[]> {
  const rows = await db.rush.where('packId').equals(packId).toArray()
  return rows.sort((a, b) => b.savedAt - a.savedAt)
}

/** Keep a Rush batch, then drop the oldest beyond `RUSH_KEPT`. */
export async function saveRush(row: RushRow, db = playtestDb()): Promise<void> {
  await db.rush.put(row)
  const extra = (await listRush(row.packId, db)).slice(RUSH_KEPT)
  if (extra.length) await db.rush.bulkDelete(extra.map((r) => r.id))
}

export const deleteRush = (id: string, db = playtestDb()) => db.rush.delete(id)
