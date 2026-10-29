/**
 * Image files the engine keeps (imported tilesets). Blobs live in the engine's
 * IndexedDB; a map only stores the asset id. Loaded blobs are cached so every
 * pane and chunk shares one copy.
 */
import { newId } from '@/core/model/ids'
import { type AssetRow, db as defaultDb, type EngineDB } from './db'

export class AssetStore {
  private cache = new Map<string, Promise<Blob | undefined>>()
  constructor(private db: EngineDB = defaultDb) {}

  /** Store a file, returning its new asset id. */
  async put(blob: Blob, name: string): Promise<string> {
    const id = newId()
    await this.db.assets.put({ id, name, mime: blob.type || 'image/png', blob })
    this.cache.set(id, Promise.resolve(blob))
    return id
  }

  /** Store under a known id (restoring from a map file). */
  async putWithId(row: AssetRow): Promise<void> {
    await this.db.assets.put(row)
    this.cache.set(row.id, Promise.resolve(row.blob))
  }

  get(id: string): Promise<Blob | undefined> {
    let hit = this.cache.get(id)
    if (!hit) {
      hit = this.db.assets.get(id).then((r) => r?.blob)
      this.cache.set(id, hit)
    }
    return hit
  }

  async row(id: string): Promise<AssetRow | undefined> {
    return this.db.assets.get(id)
  }
}

export const assets = new AssetStore()
