/**
 * The engine's own IndexedDB, separate from the card app's `card-maker` DB so
 * the two never share state. One table of maps (the whole MapDoc per row) plus a
 * small settings table (e.g. the last-open map). Blobs come later with real tile
 * assets; a map is plain JSON for now, so the schema stays tiny.
 */
import Dexie, { type EntityTable } from 'dexie'
import type { MapDoc } from '../model/map'

/** A stored map: the document plus when it was last written. */
export type MapRow = MapDoc & { updatedAt: number }

export interface SettingRow {
  key: string
  value: unknown
}

export class EngineDB extends Dexie {
  maps!: EntityTable<MapRow, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'hearthside-engine') {
    super(name)
    this.version(1).stores({
      maps: 'id, name, updatedAt',
      settings: 'key',
    })
  }
}

export const db = new EngineDB()
