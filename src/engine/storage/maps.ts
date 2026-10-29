/**
 * Reading and writing maps. A thin layer over the Dexie DB so the UI and
 * autosave never touch Dexie directly, and tests can swap in a fresh DB.
 */
import { newId } from '@/core/model/ids'
import { type EngineDB, db as defaultDb } from './db'
import type { MapDoc } from '../model/map'
import { migrateMap } from '../model/migrate'

/** A row for the maps list (no block data). */
export interface MapSummary {
  id: string
  name: string
  updatedAt: number
}

const LAST_OPEN = 'lastOpenMapId'

export class MapStore {
  constructor(private db: EngineDB = defaultDb) {}

  /** Every map, most recently edited first. */
  async list(): Promise<MapSummary[]> {
    const rows = await this.db.maps.orderBy('updatedAt').reverse().toArray()
    return rows.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt }))
  }

  /** A stored map, upgraded to the current format (maps from older builds included). */
  async load(id: string): Promise<MapDoc | undefined> {
    const row = await this.db.maps.get(id)
    if (!row) return undefined
    const { updatedAt: _u, ...map } = row
    return migrateMap(map)
  }

  /** Write a map (insert or replace), stamping updatedAt. */
  async save(map: MapDoc): Promise<void> {
    await this.db.maps.put({ ...map, updatedAt: Date.now() })
  }

  async remove(id: string): Promise<void> {
    await this.db.maps.delete(id)
    if ((await this.getLastOpen()) === id) await this.setLastOpen(undefined)
  }

  async rename(id: string, name: string): Promise<void> {
    await this.db.maps.update(id, { name, updatedAt: Date.now() })
  }

  /** Copy a map under a new id and a "(copy)" name; returns the new map. */
  async duplicate(id: string): Promise<MapDoc | undefined> {
    const map = await this.load(id)
    if (!map) return undefined
    const copy: MapDoc = { ...structuredClone(map), id: newId(), name: `${map.name} (copy)` }
    await this.save(copy)
    return copy
  }

  async getLastOpen(): Promise<string | undefined> {
    return (await this.db.settings.get(LAST_OPEN))?.value as string | undefined
  }

  async setLastOpen(id: string | undefined): Promise<void> {
    if (id) await this.db.settings.put({ key: LAST_OPEN, value: id })
    else await this.db.settings.delete(LAST_OPEN)
  }
}

export const maps = new MapStore()
