import type { BleedFill } from '@/core/model/types'
import type { RenderNode } from '@/core/render/renderTypes'
import { bleedRegions } from '../bleedBand'
import type { PrintJob } from '../job'
import type { Rect } from '../layout'
import { CanvasTarget } from './canvasTarget'
import type { DrawTarget, PdfImage } from './drawTarget'
import { renderCard, type PrintResources } from './renderCard'

export interface BleedBandOptions {
  card: { w: number; h: number }
  bleedMm: number
  mode: Exclude<BleedFill, 'off'>
  pxPerMm: number
}

/** Card raster size (W × H) and bleed width (B, rounded up so it always reaches the bleed edge), in px. */
export function bandPx(o: BleedBandOptions) {
  return {
    W: Math.max(1, Math.round(o.card.w * o.pxPerMm)),
    H: Math.max(1, Math.round(o.card.h * o.pxPerMm)),
    B: Math.max(1, Math.ceil(o.bleedMm * o.pxPerMm)),
  }
}

/**
 * Bands for one card size of a job at this resolution, or null when the bleed
 * is drawn as designed. `card` defaults to the job's first size group.
 */
export function bleedBands(
  job: PrintJob,
  pxPerMm: number,
  res: PrintResources,
  card = job.groups[0]?.card ?? {
    w: job.project.defaultSize.widthMm,
    h: job.project.defaultSize.heightMm,
  },
) {
  const mode = job.settings.bleedFill
  const bleedMm = job.project.bleedMm
  if (mode === 'off' || bleedMm <= 0) return null
  return new BleedBands({ card, bleedMm, mode, pxPerMm }, res)
}

/**
 * The card with its bleed filled from its own edge, as one opaque canvas the
 * size of the bleed box. It is drawn over the vector card clipped to the bleed
 * (see `drawBand`), so only the bleed, which is cut off, becomes an image.
 * Opaque on purpose: a transparent middle is stored as transparent black, and
 * PDF viewers that smooth colour and transparency separately then show a dark
 * line on the cut line.
 */
export async function renderBleedBand(
  nodes: RenderNode[],
  o: BleedBandOptions,
  res: PrintResources,
): Promise<HTMLCanvasElement> {
  const { W, H, B } = bandPx(o)
  const card = document.createElement('canvas')
  card.width = W
  card.height = H
  const cctx = card.getContext('2d')!
  cctx.scale(W / o.card.w, H / o.card.h)
  const box = { x: 0, y: 0, w: o.card.w, h: o.card.h }
  await renderCard(new CanvasTarget(cctx), nodes, box, box, res)

  const band = document.createElement('canvas')
  band.width = W + 2 * B
  band.height = H + 2 * B
  const ctx = band.getContext('2d')!
  ctx.drawImage(card, B, B)
  for (const r of bleedRegions(W, H, B, o.mode)) {
    ctx.save()
    ctx.translate(r.dst.x + (r.flipX ? r.dst.w : 0), r.dst.y + (r.flipY ? r.dst.h : 0))
    ctx.scale(r.flipX ? -1 : 1, r.flipY ? -1 : 1)
    ctx.drawImage(card, r.src.x, r.src.y, r.src.w, r.src.h, 0, 0, r.dst.w, r.dst.h)
    ctx.restore()
  }
  return band
}

/** The bleed box minus the trim, as one path: outer rectangle clockwise, trim counter-clockwise. */
export function bleedFramePath(
  t: Pick<DrawTarget, 'moveTo' | 'lineTo' | 'closePath'>,
  cell: Rect,
  trim: Rect,
) {
  t.moveTo(cell.x, cell.y)
  t.lineTo(cell.x + cell.w, cell.y)
  t.lineTo(cell.x + cell.w, cell.y + cell.h)
  t.lineTo(cell.x, cell.y + cell.h)
  t.closePath()
  t.moveTo(trim.x, trim.y)
  t.lineTo(trim.x, trim.y + trim.h)
  t.lineTo(trim.x + trim.w, trim.y + trim.h)
  t.lineTo(trim.x + trim.w, trim.y)
  t.closePath()
}

/** Draw a band over a card that is already drawn, only in its bleed. */
export async function drawBand(t: DrawTarget, img: PdfImage, cell: Rect, trim: Rect, at: Rect) {
  t.save()
  bleedFramePath(t, cell, trim)
  t.clip()
  await t.image(img, at.x, at.y, at.w, at.h)
  t.restore()
}

/** JPEG quality of the bands: they are cut off, so this only has to look right at the cut. */
const BAND_QUALITY = 0.92

/**
 * Bleed bands for a print run, made once per card side. Copies reuse them, and
 * so do cards whose side looks exactly the same (often every back).
 */
let nextBandId = 0

export class BleedBands {
  private canvases = new WeakMap<RenderNode[], Promise<HTMLCanvasElement>>()
  private images = new WeakMap<RenderNode[], Promise<PdfImage>>()
  private byContent = new Map<string, Promise<PdfImage>>()
  readonly px: { W: number; H: number; B: number }

  constructor(
    private options: BleedBandOptions,
    private res: PrintResources,
  ) {
    this.px = bandPx(options)
  }

  /** Where the band goes (mm) so its empty middle lines up exactly with the trim. */
  placement(trim: { x: number; y: number; w: number; h: number }) {
    const { W, H, B } = this.px
    const kx = trim.w / W
    const ky = trim.h / H
    return { x: trim.x - B * kx, y: trim.y - B * ky, w: (W + 2 * B) * kx, h: (H + 2 * B) * ky }
  }

  canvas(nodes: RenderNode[]): Promise<HTMLCanvasElement> {
    let p = this.canvases.get(nodes)
    if (!p) {
      p = renderBleedBand(nodes, this.options, this.res)
      this.canvases.set(nodes, p)
    }
    return p
  }

  /**
   * The band for the PDF. It is opaque, so it is a JPEG: the browser encodes it
   * natively and jsPDF embeds JPEG data as is (a PNG would be decoded and
   * re-compressed in JavaScript, which made exports slow).
   */
  pdfImage(nodes: RenderNode[]): Promise<PdfImage> {
    let p = this.images.get(nodes)
    if (p) return p
    const key = JSON.stringify(nodes)
    p = this.byContent.get(key)
    if (!p) {
      // Unique across instances: one PDF holds the bands of every card size.
      const id = `bleed${nextBandId++}`
      p = this.canvas(nodes).then(async (band) => {
        // Only the bleed shows (the middle is clipped away under the vector card), so
        // a flat middle keeps the JPEG small. A few pixels of the card stay at the cut.
        const c = document.createElement('canvas')
        c.width = band.width
        c.height = band.height
        const ctx = c.getContext('2d')!
        ctx.drawImage(band, 0, 0)
        const { W, H, B } = this.px
        const keep = Math.max(4, Math.round(B / 2))
        if (W > 4 * keep && H > 4 * keep) {
          ctx.fillStyle = '#808080'
          ctx.fillRect(B + keep, B + keep, W - 2 * keep, H - 2 * keep)
        }
        const blob = await new Promise<Blob>((r) =>
          c.toBlob((b) => r(b!), 'image/jpeg', BAND_QUALITY),
        )
        return {
          kind: 'raster',
          id,
          format: 'JPEG',
          data: new Uint8Array(await blob.arrayBuffer()),
          widthPx: c.width,
          heightPx: c.height,
        }
      })
      this.byContent.set(key, p)
    }
    this.images.set(nodes, p)
    return p
  }
}
