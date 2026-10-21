import Dexie, { type EntityTable } from 'dexie'
import type { AsState } from '@/adventure/state'
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
  rules?: { state: AsState; past: AsState[]; viewer: number | null }
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

export interface SetupRow {
  id: string
  setup: GameSetup
}

export class PlaytestDB extends Dexie {
  packs!: EntityTable<PackRow, 'id'>
  games!: EntityTable<GameRow, 'packId'>
  setups!: EntityTable<SetupRow, 'id'>
  decks!: EntityTable<DeckRow, 'id'>

  constructor(name = 'card-maker-playtest') {
    super(name)
    this.version(1).stores({ packs: 'id, importedAt', games: 'packId', setups: 'id' })
    this.version(2).stores({ decks: 'id, packId' })
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
