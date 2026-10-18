import type { Asset } from '@/core/model/types'
import type { PdfImage } from './drawTarget'

/**
 * Asset → PDF image. PNG and JPEG are embedded as-is (full resolution);
 * other raster formats (WebP…) are converted to PNG; SVG stays vector.
 */
export class PdfImages {
  private cache = new Map<string, Promise<PdfImage | undefined>>()

  constructor(private assets: Record<string, Asset>) {}

  get(id: string): Promise<PdfImage | undefined> {
    let p = this.cache.get(id)
    if (!p) {
      p = this.load(id)
      this.cache.set(id, p)
    }
    return p
  }

  private async load(id: string): Promise<PdfImage | undefined> {
    const a = this.assets[id]
    if (!a) return undefined
    if (a.isVector) return { kind: 'svg', id, svg: await a.blob.text() }
    const bytes = new Uint8Array(await a.blob.arrayBuffer())
    if (a.mime === 'image/png' || a.mime === 'image/jpeg') {
      return {
        kind: 'raster',
        id,
        format: a.mime === 'image/png' ? 'PNG' : 'JPEG',
        data: bytes,
        widthPx: a.widthPx,
        heightPx: a.heightPx,
      }
    }
    const bmp = await createImageBitmap(a.blob)
    const c = document.createElement('canvas')
    c.width = bmp.width
    c.height = bmp.height
    c.getContext('2d')!.drawImage(bmp, 0, 0)
    bmp.close()
    const png = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'))
    return {
      kind: 'raster',
      id,
      format: 'PNG',
      data: new Uint8Array(await png.arrayBuffer()),
      widthPx: c.width,
      heightPx: c.height,
    }
  }
}
