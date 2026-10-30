/**
 * The engine's map document (v2): a grid of tile columns, as in Final Fantasy
 * Tactics. Each grid cell (x, z) holds at most one Tile: a column from the
 * ground up to its height, measured in half steps (h = 2 is one full block).
 * A tile can slope, can be water or blocked, and carries its own top and side
 * textures from a tileset. Detached "overhang" blocks (bridges, arches) sit on
 * top of the grid; the rules ignore them for now.
 *
 * World space: x runs east, z runs south, y is up; one full step = 1 unit.
 * Everything here is pure data (no Three.js), cheap to snapshot for undo and
 * stored as JSON. See docs/engine.md.
 */
import { newId } from '@/core/model/ids'
import { BUILTIN, builtinTileset, ref, type TileRef, type Tileset } from './tileset'

/** A side of a tile column: north is −z, east +x, south +z, west −x. */
export type Dir = 'n' | 'e' | 's' | 'w'
export const DIRS: Dir[] = ['n', 'e', 's', 'w']
export const DIR_STEP: Record<Dir, { dx: number; dz: number }> = {
  n: { dx: 0, dz: -1 },
  e: { dx: 1, dz: 0 },
  s: { dx: 0, dz: 1 },
  w: { dx: -1, dz: 0 },
}

export type TileKind = 'ground' | 'water' | 'blocked'

/** A kind of terrain in the palette, with the tiles its faces show by default. */
export interface TileType {
  id: string
  name: string
  top: TileRef
  /** The top band of each side wall (e.g. grass edge over dirt). */
  side: TileRef
  /** The bands below it; defaults to `side`. */
  sideLower?: TileRef
  bottom: TileRef
  /** 'drawn' uses `side`; 'auto' generates a draft side from the top tile's edges. */
  sideMode: 'drawn' | 'auto'
  kind: TileKind
}

/** A slope: the top rises toward `dir` by `rise` half steps. */
export interface Slope {
  dir: Dir
  rise: 1 | 2
}

/** One grid cell's column. */
export interface Tile {
  type: string
  /** Height of the top surface in half steps (0 = flat on the ground). */
  h: number
  slope?: Slope
  /** Overrides the type's kind. */
  kind?: TileKind
  /** Per-face texture overrides (the type's tiles are the defaults). */
  top?: TileRef
  sides?: Partial<Record<Dir, TileRef>>
}

/** An integer cell in 3D, used for overhang blocks (y in full steps). */
export interface Cell {
  x: number
  y: number
  z: number
}

/** A detached block: a bridge plank, an arch stone. */
export interface Block {
  type: string
}

/**
 * A thing placed on the map that isn't terrain (a character, prop, spawn…).
 * Reserved so card-backed entities and a later card-battle module fit without a
 * model change. Placed by Objects mode in a later slice.
 */
export interface Entity {
  id: string
  kind: string
  at: Cell
  /** When set, this entity's stats and art come from a card in an imported game pack. */
  cardRef?: { packId: string; cardId: string }
}

/** The game's default camera for this map (also the editor's Game camera view). */
export interface MapCamera {
  /** Vertical field of view in degrees. */
  fov: number
  /** Which of the four diagonal views (0–3), turned in 90° steps. */
  yaw: number
  /** 0 = low and flat, 1 = high and steep. */
  tilt: number
}

export interface MapDoc {
  version: 2
  id: string
  name: string
  /** Footprint in tiles. */
  size: { x: number; z: number }
  /** Row-major (index = z * size.x + x); null = no tile (a hole). */
  tiles: (Tile | null)[]
  overhangs: Record<string, Block>
  entities: Entity[]
  tileTypes: TileType[]
  tilesets: Tileset[]
  camera: MapCamera
  /** Where this map's cards come from (used from phase 2 on). Older maps have none. */
  cards?: CardSource
}

/**
 * The cards the Engine works with: the Cardworks project open in Cards (live), or a
 * game pack (.cmpack) loaded into it. Both are keyed by the Cardworks project id; the
 * name is kept for display.
 */
export interface CardSource {
  kind: 'project' | 'pack'
  id: string
  name: string
}

export const DEFAULT_CAMERA: MapCamera = { fov: 50, yaw: 0, tilt: 0.55 }

// ---------- grid helpers ----------

export const inGrid = (map: MapDoc, x: number, z: number) =>
  x >= 0 && z >= 0 && x < map.size.x && z < map.size.z

export const tileIndex = (map: MapDoc, x: number, z: number) => z * map.size.x + x

export const tileAt = (map: MapDoc, x: number, z: number): Tile | null =>
  inGrid(map, x, z) ? (map.tiles[tileIndex(map, x, z)] ?? null) : null

export function setTile(map: MapDoc, x: number, z: number, tile: Tile | null) {
  if (inGrid(map, x, z)) map.tiles[tileIndex(map, x, z)] = tile
}

export const typeOf = (map: MapDoc, id: string): TileType | undefined =>
  map.tileTypes.find((t) => t.id === id)

export const kindOf = (map: MapDoc, tile: Tile): TileKind =>
  tile.kind ?? typeOf(map, tile.type)?.kind ?? 'ground'

/** The tile shown on a column's top face: the override, else the type's. */
export function topRef(map: MapDoc, tile: Tile): TileRef {
  return tile.top ?? typeOf(map, tile.type)?.top ?? ref(BUILTIN.stone)
}

/**
 * The tiles shown on one side wall: `ref` for its top band, `lower` for the
 * bands under it. A face override covers the whole side; otherwise the type's
 * side tiles. `auto` marks a type whose side is generated from its top tile.
 */
export function sideRef(
  map: MapDoc,
  tile: Tile,
  dir: Dir,
): { ref: TileRef; lower: TileRef; auto: boolean } {
  const override = tile.sides?.[dir]
  if (override) return { ref: override, lower: override, auto: false }
  const type = typeOf(map, tile.type)
  if (!type) return { ref: ref(BUILTIN.stone), lower: ref(BUILTIN.stone), auto: false }
  if (type.sideMode === 'auto') {
    const top = topRef(map, tile)
    return { ref: top, lower: top, auto: true }
  }
  return { ref: type.side, lower: type.sideLower ?? type.side, auto: false }
}

/**
 * The top surface's four corner heights in half steps: [nw, ne, se, sw].
 * A slope lifts the two corners on its `dir` edge by `rise`.
 */
export function cornerHeights(tile: Tile): [number, number, number, number] {
  const h = tile.h
  const r = tile.slope?.rise ?? 0
  switch (tile.slope?.dir) {
    case 'n':
      return [h + r, h + r, h, h]
    case 'e':
      return [h, h + r, h + r, h]
    case 's':
      return [h, h, h + r, h + r]
    case 'w':
      return [h + r, h, h, h + r]
    default:
      return [h, h, h, h]
  }
}

/** The two top-corner heights along one edge, ordered left→right as seen from outside. */
export function edgeHeights(tile: Tile | null, dir: Dir): [number, number] {
  if (!tile) return [0, 0]
  const [nw, ne, se, sw] = cornerHeights(tile)
  switch (dir) {
    case 'n':
      return [ne, nw]
    case 'e':
      return [se, ne]
    case 's':
      return [sw, se]
    case 'w':
      return [nw, sw]
  }
}

/** The edge of the neighbour that faces `dir`'s side, in the same left→right order. */
export function neighbourEdge(map: MapDoc, x: number, z: number, dir: Dir): [number, number] {
  const { dx, dz } = DIR_STEP[dir]
  const nb = tileAt(map, x + dx, z + dz)
  if (!nb) return [0, 0]
  const opposite: Record<Dir, Dir> = { n: 's', s: 'n', e: 'w', w: 'e' }
  const [a, b] = edgeHeights(nb, opposite[dir])
  return [b, a] // the neighbour's edge runs the other way
}

/** The stable key for an overhang cell. */
export const cellKey = (c: Cell): string => `${c.x},${c.y},${c.z}`

export function parseCellKey(key: string): Cell {
  const [x, y, z] = key.split(',').map(Number)
  return { x, y, z }
}

/** Placed tiles (for the size readout and tests). */
export const tileCountOf = (map: MapDoc): number => map.tiles.filter(Boolean).length

// ---------- starters ----------

/** The starter palette, drawn from the built-in tileset. */
export function defaultTileTypes(): TileType[] {
  const t = (
    id: string,
    name: string,
    top: number,
    side: number,
    bottom: number,
    kind: TileKind = 'ground',
    lower?: number,
  ): TileType => ({
    id,
    name,
    top: ref(top),
    side: ref(side),
    ...(lower !== undefined && { sideLower: ref(lower) }),
    bottom: ref(bottom),
    sideMode: 'drawn',
    kind,
  })
  return [
    t('grass', 'Grass', BUILTIN.grassTop, BUILTIN.grassSide, BUILTIN.dirt, 'ground', BUILTIN.dirt),
    t('earth', 'Earth', BUILTIN.dirt, BUILTIN.dirt, BUILTIN.dirt),
    t('stone', 'Stone', BUILTIN.stone, BUILTIN.stoneBrick, BUILTIN.stone),
    t('sand', 'Sand', BUILTIN.sand, BUILTIN.sand, BUILTIN.sand),
    t('path', 'Path', BUILTIN.path, BUILTIN.dirt, BUILTIN.dirt),
    t('snow', 'Snow', BUILTIN.snow, BUILTIN.snowSide, BUILTIN.dirt, 'ground', BUILTIN.dirt),
    t('wood', 'Wood', BUILTIN.plank, BUILTIN.wood, BUILTIN.wood),
    t('water', 'Water', BUILTIN.water, BUILTIN.water, BUILTIN.water, 'water'),
    t('lava', 'Lava', BUILTIN.lava, BUILTIN.darkStone, BUILTIN.darkStone, 'blocked'),
  ]
}

/** A fresh map: a flat grass field one step high. */
export function newMapDoc(name = 'Untitled map', size = { x: 16, z: 16 }): MapDoc {
  return {
    version: 2,
    id: newId(),
    name,
    size,
    tiles: Array.from({ length: size.x * size.z }, () => ({ type: 'grass', h: 2 })),
    overhangs: {},
    entities: [],
    tileTypes: defaultTileTypes(),
    tilesets: [builtinTileset()],
    camera: { ...DEFAULT_CAMERA },
  }
}

/**
 * The demo map: a grass field with a stepped hill, a ramp up its south side,
 * a pond and a stone bridge across it, so every feature shows on first open.
 */
export function demoMap(): MapDoc {
  const map = newMapDoc('Demo map', { x: 16, z: 16 })
  for (let x = 0; x < 16; x++)
    for (let z = 0; z < 16; z++) {
      const d = Math.hypot(x - 9, z - 7)
      const steps = Math.max(0, Math.round(4 - d * 0.9)) // up to 4 half steps above the field
      const h = 2 + steps
      map.tiles[tileIndex(map, x, z)] = { type: steps >= 3 ? 'stone' : 'grass', h }
    }
  // A ramp leading up the hill from the south.
  for (let z = 10; z <= 11; z++) {
    const t = tileAt(map, 9, z)
    if (t) t.slope = { dir: 'n', rise: 1 }
  }
  // A pond to the west, with a path and a bridge over it.
  // The pond sits on the ground (h 0), a step below the field; the bridge deck
  // (one block, y 0–1) is flush with the field on either bank.
  for (let x = 1; x <= 4; x++)
    for (let z = 2; z <= 5; z++) map.tiles[tileIndex(map, x, z)] = { type: 'water', h: 0 }
  for (let x = 1; x <= 4; x++) map.overhangs[cellKey({ x, y: 0, z: 4 })] = { type: 'wood' }
  for (let z = 6; z < 16; z++) {
    const t = tileAt(map, 2, z)
    if (t) t.type = 'path'
  }
  return map
}
