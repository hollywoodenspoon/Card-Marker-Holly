/**
 * Map files: a single `.hsmap` JSON document for backing up a map or moving it
 * between devices. Versioned and validated on read, the way the card app's
 * project files are (src/storage/projectFile.ts), but far simpler — a MapDoc is
 * plain JSON, so there are no blobs to encode.
 */
import { newId } from '@/core/model/ids'
import { defaultPalette, type MapDoc } from '../model/map'

export interface MapFile {
  format: 'hearthside-map'
  version: 1
  exportedAt: number
  map: MapDoc
}

export function exportMapFile(map: MapDoc): MapFile {
  return { format: 'hearthside-map', version: 1, exportedAt: Date.now(), map }
}

export class MapFileError extends Error {}

/** Parse and validate a `.hsmap` file's text, returning a map with a fresh id. */
export function importMapFile(text: string): MapDoc {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new MapFileError('This file is not valid JSON.')
  }
  const file = data as Partial<MapFile>
  if (file.format !== 'hearthside-map')
    throw new MapFileError('This is not a Hearthside Engine map file.')
  if (file.version !== 1) throw new MapFileError(`Unsupported map file version: ${file.version}.`)
  const map = file.map as Partial<MapDoc> | undefined
  if (!map || typeof map !== 'object' || !map.blocks || !map.size)
    throw new MapFileError('This map file is missing its map data.')
  // Give it a new id so importing never clobbers an existing map.
  return {
    id: newId(),
    name: typeof map.name === 'string' ? map.name : 'Imported map',
    size: map.size,
    blocks: map.blocks,
    entities: Array.isArray(map.entities) ? map.entities : [],
    palette: map.palette?.blocks?.length ? map.palette : { blocks: defaultPalette() },
  }
}

/** Trigger a browser download of `map` as a `.hsmap` file. */
export function downloadMapFile(map: MapDoc) {
  const blob = new Blob([JSON.stringify(exportMapFile(map), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName(map.name)}.hsmap`
  a.click()
  URL.revokeObjectURL(url)
}

const safeName = (name: string) => name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'map'
