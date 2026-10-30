/**
 * Game files: one `.hsgame` JSON document holding a whole game for backup or moving
 * between devices: the game, its map scenes' maps, its own images (and tilesets),
 * and the game packs it uses as card sources. A live Cardworks project is a
 * reference by id only: its cards stay in Cardworks (back it up there).
 * Importing gives the game and its maps fresh ids, so it never replaces one.
 */
import { newId } from '@/core/model/ids'
import { base64ToBlob, blobToBase64 } from '@/storage/base64'
import { tidyGame, type GameDoc } from '../model/game'
import type { MapDoc } from '../model/map'
import { migrateMap } from '../model/migrate'
import type { AssetRow } from '../storage/db'

export interface FileAsset {
  id: string
  name: string
  mime: string
  data: string
  folder?: string
  width?: number
  height?: number
}

export interface GameFile {
  format: 'hearthside-game'
  version: 1
  exportedAt: number
  game: unknown
  maps: unknown[]
  assets: FileAsset[]
  /** Game packs used as card sources, as base64 `.cmpack` bytes. */
  packs: { id: string; data: string }[]
}

export class GameFileError extends Error {}

export interface GameFileParts {
  game: GameDoc
  maps: MapDoc[]
  assets: AssetRow[]
  packs: { id: string; bytes: Uint8Array }[]
}

const toB64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromB64 = (data: string) => Uint8Array.from(atob(data), (c) => c.charCodeAt(0))

export async function exportGameFile(parts: GameFileParts): Promise<GameFile> {
  return {
    format: 'hearthside-game',
    version: 1,
    exportedAt: Date.now(),
    game: parts.game,
    maps: parts.maps,
    assets: await Promise.all(
      parts.assets.map(async (a) => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        data: await blobToBase64(a.blob),
        folder: a.folder,
        width: a.width,
        height: a.height,
      })),
    ),
    packs: parts.packs.map((p) => ({ id: p.id, data: toB64(p.bytes) })),
  }
}

/** Reads a `.hsgame` file's text: a fresh-id game with its maps (scenes repointed), images and packs. */
export function parseGameFile(text: string): GameFileParts {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new GameFileError('This file is not valid JSON.')
  }
  const f = data as Partial<GameFile>
  if (f.format !== 'hearthside-game')
    throw new GameFileError('This is not a Hearthside Engine game file.')
  if (f.version !== 1) throw new GameFileError(`Unsupported game file version: ${f.version}.`)
  const raw = f.game as Partial<GameDoc> | undefined
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string')
    throw new GameFileError('This game file is missing its game.')
  const game = tidyGame(raw as GameDoc)
  game.id = newId()
  const maps: MapDoc[] = []
  const newMapId = new Map<string, string>()
  for (const m of Array.isArray(f.maps) ? f.maps : []) {
    const map = migrateMap(m)
    const id = newId()
    newMapId.set(map.id, id)
    maps.push({ ...map, id })
  }
  for (const s of game.scenes) if (s.kind === 'map') s.mapId = newMapId.get(s.mapId) ?? s.mapId
  const assets: AssetRow[] = (Array.isArray(f.assets) ? f.assets : []).map((a) => ({
    id: a.id,
    name: a.name,
    mime: a.mime,
    blob: base64ToBlob(a.data, a.mime),
    gameId: game.id,
    folder: a.folder,
    width: a.width,
    height: a.height,
  }))
  const packs = (Array.isArray(f.packs) ? f.packs : []).map((p) => ({
    id: p.id,
    bytes: fromB64(p.data),
  }))
  return { game, maps, assets, packs }
}

export const safeFileName = (name: string) =>
  name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'game'
