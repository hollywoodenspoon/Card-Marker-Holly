/**
 * Tilesets: a grid of equal square tiles in one image (an Aseprite or any PNG
 * export). A face points at one tile with a TileRef. This module is pure: it
 * knows sizes and indices, never pixels. The pixels live in the engine's asset
 * store (imported tilesets) or are drawn at runtime (the built-in starter set,
 * see scene/tilesetImage.ts).
 */

export type TileSize = 16 | 32 | 48
export const TILE_SIZES: TileSize[] = [16, 32, 48]

/** One tile in one tileset. */
export interface TileRef {
  tileset: string
  index: number
}

export interface Tileset {
  id: string
  name: string
  tileSize: TileSize
  cols: number
  rows: number
  /** The image blob in the engine's asset store; absent for the built-in set. */
  assetId?: string
  /** The image's size in pixels, so the tile size can change later. */
  imageW?: number
  imageH?: number
}

/** The starter tileset drawn at runtime, so a new map works with no files. */
export const BUILTIN_TILESET = 'builtin'

/** Tile indices in the built-in tileset (8 columns × 2 rows of 16 px). */
export const BUILTIN = {
  grassTop: 0,
  dirt: 1,
  stone: 2,
  sand: 3,
  water: 4,
  grassSide: 5,
  stoneBrick: 6,
  wood: 7,
  snow: 8,
  snowSide: 9,
  lava: 10,
  path: 11,
  darkStone: 12,
  moss: 13,
  roof: 14,
  plank: 15,
} as const

export function builtinTileset(): Tileset {
  return { id: BUILTIN_TILESET, name: 'Starter tiles', tileSize: 16, cols: 8, rows: 2 }
}

export const ref = (index: number, tileset = BUILTIN_TILESET): TileRef => ({ tileset, index })

export const tileCount = (ts: Tileset): number => ts.cols * ts.rows

/** Columns and rows a tileset image of `w × h` pixels holds at `tileSize` (partial tiles dropped). */
export function gridFor(w: number, h: number, tileSize: TileSize): { cols: number; rows: number } {
  return { cols: Math.floor(w / tileSize), rows: Math.floor(h / tileSize) }
}

/**
 * The UV rectangle of a tile in its tileset texture (Three.js UVs: v = 0 at the
 * bottom). Inset by a fraction of a texel so neighbouring tiles never bleed in.
 */
export function tileUv(
  ts: Tileset,
  index: number,
): { u0: number; v0: number; u1: number; v1: number } {
  const i = Math.max(0, Math.min(tileCount(ts) - 1, index))
  const col = i % ts.cols
  const row = Math.floor(i / ts.cols)
  const insetU = 0.01 / (ts.cols * ts.tileSize)
  const insetV = 0.01 / (ts.rows * ts.tileSize)
  return {
    u0: col / ts.cols + insetU,
    u1: (col + 1) / ts.cols - insetU,
    v0: 1 - (row + 1) / ts.rows + insetV,
    v1: 1 - row / ts.rows - insetV,
  }
}

export const sameRef = (a?: TileRef, b?: TileRef) =>
  !!a && !!b && a.tileset === b.tileset && a.index === b.index
