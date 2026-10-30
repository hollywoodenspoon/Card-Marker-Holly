/**
 * The engine's own IndexedDB, separate from the card app's `card-maker` DB so
 * the two never share state.
 * - v1: maps (the whole MapDoc per row) and settings (e.g. the last-open map).
 * - v2: assets, the image blobs of imported tilesets. Rows from v1 builds are
 *   upgraded to the current MapDoc when read (see model/migrate.ts).
 * - v3: games (a GameDoc per row). Maps stay in their table; a game's map scenes
 *   point at them. Scene pictures are assets too.
 */
import Dexie, { type EntityTable } from 'dexie'
import type { GameDoc } from '../model/game'
import type { MapDoc } from '../model/map'

/** A stored map: the document plus when it was last written. */
export type MapRow = MapDoc & { updatedAt: number }

/** A stored game: the document plus when it was last written. */
export type GameRow = GameDoc & { updatedAt: number }

export interface SettingRow {
  key: string
  value: unknown
}

/** An uploaded file (a tileset PNG, a scene picture), stored as-is. */
export interface AssetRow {
  id: string
  name: string
  mime: string
  blob: Blob
  /** Game images: which game they belong to, and their folder (tilesets have neither). */
  gameId?: string
  folder?: string
  width?: number
  height?: number
}

export class EngineDB extends Dexie {
  maps!: EntityTable<MapRow, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  assets!: EntityTable<AssetRow, 'id'>
  games!: EntityTable<GameRow, 'id'>

  constructor(name = 'hearthside-engine') {
    super(name)
    this.version(1).stores({
      maps: 'id, name, updatedAt',
      settings: 'key',
    })
    this.version(2).stores({
      maps: 'id, name, updatedAt',
      settings: 'key',
      assets: 'id',
    })
    this.version(3).stores({
      maps: 'id, name, updatedAt',
      settings: 'key',
      assets: 'id, gameId',
      games: 'id, name, updatedAt',
    })
  }
}

export const db = new EngineDB()
