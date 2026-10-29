/**
 * Adding tilesets to the open map: import a PNG (any image the browser reads;
 * Aseprite's "Export Sprite Sheet" PNG works as-is), cut into 16, 32 or 48 px
 * tiles, and change a tileset's tile size later. Adding or resizing a tileset is
 * an undoable edit of the map; the image itself lives in the asset store.
 */
import { newId } from '@/core/model/ids'
import { gridFor, type TileSize } from '../model/tileset'
import { textureStore } from '../scene/textureStore'
import { useEngine } from '../store/engineStore'
import { assets } from './assets'

export class TilesetError extends Error {}

/** Import an image as a tileset; returns the new tileset's id. */
export async function importTileset(file: File, tileSize: TileSize): Promise<string> {
  const bmp = await createImageBitmap(file).catch(() => {
    throw new TilesetError('This file is not an image the app can read.')
  })
  const { width, height } = bmp
  bmp.close?.()
  const { cols, rows } = gridFor(width, height, tileSize)
  if (cols < 1 || rows < 1)
    throw new TilesetError(
      `The image (${width} × ${height} px) is smaller than one ${tileSize} px tile.`,
    )
  const assetId = await assets.put(file, file.name)
  const id = newId()
  const name = file.name.replace(/\.[^.]+$/, '') || 'Tileset'
  useEngine.getState().commit((m) => {
    m.tilesets.push({ id, name, tileSize, cols, rows, assetId, imageW: width, imageH: height })
  })
  useEngine.getState().endStroke()
  return id
}

/** Re-cut an imported tileset at another tile size. */
export function setTileSize(id: string, tileSize: TileSize) {
  useEngine.getState().commit((m) => {
    const ts = m.tilesets.find((t) => t.id === id)
    if (!ts || !ts.imageW || !ts.imageH || ts.tileSize === tileSize) return
    const { cols, rows } = gridFor(ts.imageW, ts.imageH, tileSize)
    if (cols < 1 || rows < 1) return
    ts.tileSize = tileSize
    ts.cols = cols
    ts.rows = rows
  })
  useEngine.getState().endStroke()
  const ts = useEngine.getState().map.tilesets.find((t) => t.id === id)
  if (ts) textureStore.refreshAuto(ts)
}
