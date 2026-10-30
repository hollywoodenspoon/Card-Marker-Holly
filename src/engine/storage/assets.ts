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

  /** A game's own picture (a scene background, a character), with its pixel size. */
  async putImage(file: Blob, name: string, gameId: string, folder?: string): Promise<string> {
    const id = newId()
    let width: number | undefined
    let height: number | undefined
    try {
      const bmp = await createImageBitmap(file)
      width = bmp.width
      height = bmp.height
      bmp.close()
    } catch {
      // Not a picture the browser can read: stored anyway, shown as missing.
    }
    await this.db.assets.put({
      id,
      name,
      mime: file.type || 'image/png',
      blob: file,
      gameId,
      folder,
      width,
      height,
    })
    this.cache.set(id, Promise.resolve(file))
    return id
  }

  /** A game's own pictures, by name. */
  async listGame(gameId: string): Promise<AssetRow[]> {
    const rows = await this.db.assets.where('gameId').equals(gameId).toArray()
    return rows.sort((a, b) => a.name.localeCompare(b.name))
  }

  async update(id: string, patch: Partial<Pick<AssetRow, 'name' | 'folder'>>) {
    await this.db.assets.update(id, patch)
  }

  async remove(id: string) {
    await this.db.assets.delete(id)
    this.cache.delete(id)
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
