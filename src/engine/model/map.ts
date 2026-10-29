/**
 * The engine's map document. All geometry is on an integer cell grid: a block
 * at cell (x, y, z) fills the unit cube from (x, y, z) to (x+1, y+1, z+1), with
 * y up. Everything here is pure data (no Three.js), so it serialises straight to
 * storage and is cheap to snapshot for undo. See docs/engine.md.
 */
import { newId } from '@/core/model/ids'

/** An integer cell on the grid. */
export interface Cell {
  x: number
  y: number
  z: number
}

/** A placed block: which palette block type fills this cell. */
export interface Block {
  type: string
}

/** A kind of block in the palette. `color` is the base tint; a tile texture (PR2) keys off `id`. */
export interface BlockType {
  id: string
  name: string
  color: string
}

/**
 * A thing placed on the map that isn't a block (a character, prop, spawn…).
 * Reserved now so card-backed entities (data + art) and, later, a card-battle
 * module fit without a model change. Empty until the integration milestone.
 */
export interface Entity {
  id: string
  kind: string
  at: Cell
  /** When set, this entity's stats and art come from a card in an imported game pack. */
  cardRef?: { packId: string; cardId: string }
}

export interface MapDoc {
  id: string
  name: string
  /** Footprint in cells; height is open-ended. */
  size: { x: number; z: number }
  blocks: Record<string, Block>
  entities: Entity[]
  palette: { blocks: BlockType[] }
}

/** The stable key for a cell in `MapDoc.blocks`. */
export const cellKey = (c: Cell): string => `${c.x},${c.y},${c.z}`

/** Parse a `MapDoc.blocks` key back into a cell. */
export function parseCellKey(key: string): Cell {
  const [x, y, z] = key.split(',').map(Number)
  return { x, y, z }
}

/** True when `c` is within the map footprint and at or above the ground. */
export function inBounds(map: MapDoc, c: Cell): boolean {
  return c.x >= 0 && c.z >= 0 && c.x < map.size.x && c.z < map.size.z && c.y >= 0
}

export const blockAt = (map: MapDoc, c: Cell): Block | undefined => map.blocks[cellKey(c)]

/** The default starter palette (plain tints until the Paint tool adds tile textures). */
export function defaultPalette(): BlockType[] {
  return [
    { id: 'grass', name: 'Grass', color: '#6f9f4a' },
    { id: 'earth', name: 'Earth', color: '#8a6a44' },
    { id: 'stone', name: 'Stone', color: '#8a8f99' },
    { id: 'sand', name: 'Sand', color: '#d9c38a' },
    { id: 'water', name: 'Water', color: '#4f82c4' },
  ]
}

/** A fresh, empty map. */
export function newMapDoc(name = 'Untitled map', size = { x: 16, z: 16 }): MapDoc {
  return {
    id: newId(),
    name,
    size,
    blocks: {},
    entities: [],
    palette: { blocks: defaultPalette() },
  }
}

/**
 * A small demo map: a flat grass field with a low earth hill, so the viewport
 * shows textured blocks and depth straight away.
 */
export function demoMap(): MapDoc {
  const map = newMapDoc('Demo map', { x: 16, z: 16 })
  for (let x = 0; x < map.size.x; x++)
    for (let z = 0; z < map.size.z; z++) map.blocks[cellKey({ x, y: 0, z })] = { type: 'grass' }
  // A rounded hill near the centre.
  const cx = 8
  const cz = 8
  for (let x = 0; x < map.size.x; x++)
    for (let z = 0; z < map.size.z; z++) {
      const d = Math.hypot(x - cx, z - cz)
      const h = Math.max(0, Math.round(3 - d * 0.7))
      for (let y = 1; y <= h; y++)
        map.blocks[cellKey({ x, y, z })] = { type: y === h && h >= 1 ? 'grass' : 'earth' }
    }
  return map
}

/** Total placed blocks — handy for tests and a size readout. */
export const blockCount = (map: MapDoc): number => Object.keys(map.blocks).length
