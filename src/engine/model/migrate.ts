/**
 * Brings any stored map up to the current MapDoc (v2), so maps saved by the
 * first engine builds and old `.hsmap` files keep opening.
 *
 * v1 stored loose blocks (`blocks: Record<"x,y,z", {type}>`). Each column's
 * unbroken stack from the ground becomes one tile of that height, typed by its
 * top block; blocks above a gap become overhangs.
 */
import { builtinTileset, BUILTIN_TILESET } from './tileset'
import {
  type Block,
  cellKey,
  DEFAULT_CAMERA,
  defaultTileTypes,
  type MapDoc,
  newMapDoc,
  parseCellKey,
  type Tile,
  tileIndex,
} from './map'

interface MapV1 {
  id?: string
  name?: string
  size?: { x: number; z: number }
  blocks?: Record<string, Block>
  entities?: MapDoc['entities']
}

export class MapFormatError extends Error {}

/** Upgrade (or tidy) a stored map. Throws MapFormatError when it isn't a map at all. */
export function migrateMap(raw: unknown): MapDoc {
  if (!raw || typeof raw !== 'object') throw new MapFormatError('This is not a map.')
  const m = raw as Partial<MapDoc> & MapV1
  if (m.version === 2) return tidyV2(m as MapDoc)
  if (m.blocks && m.size) return fromV1(m)
  throw new MapFormatError('This map is missing its map data.')
}

/** Fill anything a v2 map might lack (older v2 builds, hand-edited files). */
function tidyV2(m: MapDoc): MapDoc {
  const size = m.size
  const tiles =
    Array.isArray(m.tiles) && m.tiles.length === size.x * size.z
      ? m.tiles
      : Array.from({ length: size.x * size.z }, () => null)
  const tilesets = Array.isArray(m.tilesets) ? [...m.tilesets] : []
  if (!tilesets.some((t) => t.id === BUILTIN_TILESET)) tilesets.unshift(builtinTileset())
  return {
    version: 2,
    id: m.id,
    name: typeof m.name === 'string' ? m.name : 'Untitled map',
    size,
    tiles,
    overhangs: m.overhangs ?? {},
    entities: Array.isArray(m.entities) ? m.entities : [],
    tileTypes: m.tileTypes?.length ? m.tileTypes : defaultTileTypes(),
    tilesets,
    camera: { ...DEFAULT_CAMERA, ...m.camera },
  }
}

function fromV1(v1: MapV1): MapDoc {
  const size = v1.size!
  const map = newMapDoc(v1.name ?? 'Untitled map', size)
  if (v1.id) map.id = v1.id
  map.entities = v1.entities ?? []
  const known = new Set(map.tileTypes.map((t) => t.id))
  const typeFor = (id: string) => (known.has(id) ? id : 'stone')
  const blocks = v1.blocks ?? {}
  const used = new Set<string>()
  for (let x = 0; x < size.x; x++)
    for (let z = 0; z < size.z; z++) {
      let k = 0
      while (blocks[cellKey({ x, y: k, z })]) k++
      let tile: Tile | null = null
      if (k > 0) {
        tile = { type: typeFor(blocks[cellKey({ x, y: k - 1, z })].type), h: k * 2 }
        for (let y = 0; y < k; y++) used.add(cellKey({ x, y, z }))
      }
      map.tiles[tileIndex(map, x, z)] = tile
    }
  for (const [key, block] of Object.entries(blocks)) {
    if (used.has(key)) continue
    const c = parseCellKey(key)
    if (c.x < 0 || c.z < 0 || c.x >= size.x || c.z >= size.z || c.y < 0) continue
    map.overhangs[key] = { type: typeFor(block.type) }
  }
  return map
}
