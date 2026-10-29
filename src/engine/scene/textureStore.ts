/**
 * One texture per tileset, plus one atlas of generated side tiles per tileset
 * ("auto:<id>"), shared by every chunk and every viewport. Imported tilesets
 * load asynchronously from the asset store; until then a neutral placeholder
 * shows, and `onReady` asks the viewports to redraw.
 */
import { DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace, type Texture } from 'three'
import { BUILTIN_TILESET, type Tileset } from '../model/tileset'
import { assets } from '../storage/assets'
import { autoSidePixels, builtinTilesetPixels, type Pixels } from './tilesetImage'

/** DataTexture rows run bottom-up; tileset images (and our pixel arrays) top-down. */
function flipRows(p: Pixels): Uint8Array<ArrayBuffer> {
  const row = p.w * 4
  const out = new Uint8Array(p.data.length)
  for (let y = 0; y < p.h; y++)
    out.set(p.data.subarray(y * row, (y + 1) * row), (p.h - 1 - y) * row)
  return out
}

function makeTexture(p: Pixels): DataTexture {
  const tex = new DataTexture(flipRows(p), p.w, p.h, RGBAFormat)
  tex.magFilter = NearestFilter
  tex.minFilter = NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

const placeholder = (): Pixels => ({
  w: 1,
  h: 1,
  data: new Uint8ClampedArray([128, 128, 128, 255]),
})

/** Decode an image blob to pixels (browser only). */
export async function decodePixels(blob: Blob): Promise<Pixels> {
  const bmp = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0)
  const img = ctx.getImageData(0, 0, bmp.width, bmp.height)
  bmp.close?.()
  return { w: img.width, h: img.height, data: img.data }
}

export class TextureStore {
  private textures = new Map<string, DataTexture>()
  private pixels = new Map<string, Promise<Pixels>>()
  private canvases = new Map<string, Promise<HTMLCanvasElement>>()
  private listeners = new Set<() => void>()

  constructor(private loadBlob: (assetId: string) => Promise<Blob | undefined>) {}

  /** Called whenever a texture finishes loading (viewports redraw). */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private onReady() {
    for (const fn of this.listeners) fn()
  }

  /** The source pixels of a tileset (cached). */
  private source(ts: Tileset): Promise<Pixels> {
    let p = this.pixels.get(ts.id)
    if (!p) {
      p =
        ts.id === BUILTIN_TILESET || !ts.assetId
          ? Promise.resolve(builtinTilesetPixels())
          : this.loadBlob(ts.assetId).then((b) => (b ? decodePixels(b) : placeholder()))
      this.pixels.set(ts.id, p)
    }
    return p
  }

  /** The texture for a part's texture key: a tileset id or `auto:<tileset id>`. */
  get(key: string, tilesets: Tileset[]): Texture {
    const hit = this.textures.get(key)
    if (hit) return hit
    const auto = key.startsWith('auto:')
    const id = auto ? key.slice(5) : key
    const ts = tilesets.find((t) => t.id === id) ?? tilesets.find((t) => t.id === BUILTIN_TILESET)!
    const tex = makeTexture(placeholder())
    this.textures.set(key, tex)
    void this.source(ts).then((src) => {
      const px = auto ? autoSidePixels(src, ts.tileSize) : src
      tex.image = { data: flipRows(px), width: px.w, height: px.h }
      tex.needsUpdate = true
      this.onReady()
    })
    return tex
  }

  /** A tileset as a canvas, for the 2D view and the tile picker (no WebGL needed). */
  canvas(ts: Tileset): Promise<HTMLCanvasElement> {
    let c = this.canvases.get(ts.id)
    if (!c) {
      c = this.source(ts).then((p) => {
        const canvas = document.createElement('canvas')
        canvas.width = p.w
        canvas.height = p.h
        canvas
          .getContext('2d')!
          .putImageData(new ImageData(new Uint8ClampedArray(p.data), p.w, p.h), 0, 0)
        return canvas
      })
      this.canvases.set(ts.id, c)
    }
    return c
  }

  /** Redraw a tileset's generated sides in place (after its tile size changes). */
  refreshAuto(ts: Tileset) {
    const tex = this.textures.get(`auto:${ts.id}`)
    if (!tex) return
    void this.source(ts).then((src) => {
      const px = autoSidePixels(src, ts.tileSize)
      tex.image = { data: flipRows(px), width: px.w, height: px.h }
      tex.needsUpdate = true
      this.onReady()
    })
  }

  /** Forget a tileset (after it is replaced or removed). */
  forget(id: string) {
    for (const key of [id, `auto:${id}`]) {
      this.textures.get(key)?.dispose()
      this.textures.delete(key)
    }
    this.pixels.delete(id)
    this.canvases.delete(id)
  }
}

/** The one store every pane, the 2D view and the tile picker share. */
export const textureStore = new TextureStore((id) => assets.get(id))
