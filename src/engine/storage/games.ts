/**
 * Reading and writing games, over the engine's Dexie DB (see maps.ts for maps).
 * `ensureGame` also moves a first-time user's maps into a game: every existing map
 * becomes a map scene of "My game", and a map's saved card choice its first source.
 */
import { newId } from '@/core/model/ids'
import { type EngineDB, db as defaultDb } from './db'
import { mapScene, newGame, sourceKey, tidyGame, type GameDoc } from '../model/game'
import type { CardSource } from '../model/map'
import { migrateMap } from '../model/migrate'

export interface GameSummary {
  id: string
  name: string
  updatedAt: number
}

const LAST_OPEN = 'lastOpenGameId'

export class GameStore {
  constructor(private db: EngineDB = defaultDb) {}

  async list(): Promise<GameSummary[]> {
    const rows = await this.db.games.orderBy('updatedAt').reverse().toArray()
    return rows.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt }))
  }

  async load(id: string): Promise<GameDoc | undefined> {
    const row = await this.db.games.get(id)
    if (!row) return undefined
    const { updatedAt: _u, ...game } = row
    return tidyGame(game)
  }

  async save(game: GameDoc): Promise<void> {
    await this.db.games.put({ ...game, updatedAt: Date.now() })
  }

  /** Deletes the game, its map scenes' maps and its own images. */
  async remove(id: string): Promise<void> {
    const game = await this.load(id)
    await this.db.transaction(
      'rw',
      this.db.games,
      this.db.maps,
      this.db.assets,
      this.db.settings,
      async () => {
        await this.db.games.delete(id)
        for (const s of game?.scenes ?? []) if (s.kind === 'map') await this.db.maps.delete(s.mapId)
        await this.db.assets.where('gameId').equals(id).delete()
        if ((await this.getLastOpen()) === id) await this.db.settings.delete(LAST_OPEN)
      },
    )
  }

  /** A copy under a new id, with copies of its maps (images are shared by id). */
  async duplicate(id: string): Promise<GameDoc | undefined> {
    const game = await this.load(id)
    if (!game) return undefined
    const copy: GameDoc = { ...structuredClone(game), id: newId(), name: `${game.name} (copy)` }
    for (const s of copy.scenes) {
      if (s.kind !== 'map') continue
      const row = await this.db.maps.get(s.mapId)
      if (!row) continue
      const mapId = newId()
      await this.db.maps.put({ ...row, id: mapId, updatedAt: Date.now() })
      s.mapId = mapId
    }
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

  /**
   * The game to open: the last one, else any, else a new "My game" holding every map
   * stored so far (each a map scene; their card choices become its sources).
   */
  async ensureGame(): Promise<GameDoc> {
    const last = await this.getLastOpen()
    const open = (last && (await this.load(last))) || (await this.firstGame())
    if (open) return open
    const game = newGame('My game')
    const rows = await this.db.maps.orderBy('updatedAt').reverse().toArray()
    const seen = new Set<string>()
    for (const row of rows) {
      const map = migrateMap(row)
      game.scenes.push(mapScene(map.id, map.name))
      const c: CardSource | undefined = map.cards
      if (c && !seen.has(sourceKey(c))) {
        seen.add(sourceKey(c))
        game.sources.push(c)
      }
    }
    game.startScene = game.scenes[0]?.id ?? null
    await this.save(game)
    await this.setLastOpen(game.id)
    return game
  }

  private async firstGame(): Promise<GameDoc | undefined> {
    const [first] = await this.list()
    return first ? this.load(first.id) : undefined
  }
}

export const games = new GameStore()
