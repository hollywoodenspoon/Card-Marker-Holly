/**
 * Map files: a single `.hsmap` JSON document for backing up a map or moving it
 * between devices. Versioned and validated on read, the way the card app's
 * project files are (src/storage/projectFile.ts).
 * - v1: the map only (the first engine builds; loose blocks).
 * - v2: the map plus its imported tileset images, as base64.
 * Reading upgrades either to the current MapDoc (model/migrate.ts).
 */
import { newId } from '@/core/model/ids'
import { base64ToBlob, blobToBase64 } from '@/storage/base64'
import type { MapDoc } from '../model/map'
import { MapFormatError, migrateMap } from '../model/migrate'
import type { AssetStore } from '../storage/assets'

export interface MapFileAsset {
  id: string
  name: string
  mime: string
  data: string
}

export interface MapFile {
  format: 'hearthside-map'
  version: 1 | 2
  exportedAt: number
  map: unknown
  assets?: MapFileAsset[]
}

export class MapFileError extends Error {}

/** A map file for `map`, with the images of its imported tilesets embedded. */
export async function exportMapFile(map: MapDoc, store?: AssetStore): Promise<MapFile> {
  const assets: MapFileAsset[] = []
  if (store)
    for (const ts of map.tilesets) {
      if (!ts.assetId) continue
      const row = await store.row(ts.assetId)
      if (row)
        assets.push({
          id: row.id,
          name: row.name,
          mime: row.mime,
          data: await blobToBase64(row.blob),
        })
    }
  return { format: 'hearthside-map', version: 2, exportedAt: Date.now(), map, assets }
}

/** Parse and validate a `.hsmap` file's text: the map (with a fresh id) and its images. */
export function parseMapFile(text: string): { map: MapDoc; assets: MapFileAsset[] } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new MapFileError('This file is not valid JSON.')
  }
  const file = data as Partial<MapFile>
  if (file.format !== 'hearthside-map')
    throw new MapFileError('This is not a Hearthside Engine map file.')
  if (file.version !== 1 && file.version !== 2)
    throw new MapFileError(`Unsupported map file version: ${file.version}.`)
  let map: MapDoc
  try {
    map = migrateMap(file.map)
  } catch (e) {
    throw new MapFileError(
      e instanceof MapFormatError ? 'This map file is missing its map data.' : String(e),
    )
  }
  // A fresh id so importing never clobbers an existing map.
  return { map: { ...map, id: newId() }, assets: Array.isArray(file.assets) ? file.assets : [] }
}

/** Store a map file's images, keeping their ids so the map's tilesets still point at them. */
export async function restoreAssets(assets: MapFileAsset[], store: AssetStore) {
  for (const a of assets)
    await store.putWithId({
      id: a.id,
      name: a.name,
      mime: a.mime,
      blob: base64ToBlob(a.data, a.mime),
    })
}

/** Trigger a browser download of `map` as a `.hsmap` file. */
export async function downloadMapFile(map: MapDoc, store?: AssetStore) {
  const file = await exportMapFile(map, store)
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName(map.name)}.hsmap`
  a.click()
  URL.revokeObjectURL(url)
}

const safeName = (name: string) => name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'map'
