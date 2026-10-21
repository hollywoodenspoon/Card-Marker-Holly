import { zipSync } from 'fflate'
import type {
  Asset,
  BleedFill,
  Card,
  FontAsset,
  Project,
  Side,
  StylePreset,
  Template,
} from '@/core/model/types'
import type { RenderNode } from '@/core/render/renderTypes'
import { cardContext } from '@/templates/cardContext'
import { cardSizeOf, resolveCard } from '../job'
import { BleedBands, bleedFramePath } from '../pdf/bleedFill'
import { CanvasTarget } from '../pdf/canvasTarget'
import { renderCard } from '../pdf/renderCard'
import { createPrintResources } from '../pdf/resources'
import { normalizePrint } from '../settings'
import {
  IMAGE_FORMATS,
  imageFiles,
  imagePx,
  jpegWithDpi,
  pngWithDpi,
  type ImageExportOptions,
  type ImageFile,
} from './imageFiles'

export interface ImageExportInput {
  project: Project
  templates: Record<string, Template>
  cards: Card[]
  /** Every card in the project, for card numbers (defaults to `cards`). */
  allCards?: Record<string, Card>
  assets: Record<string, Asset>
  fonts: FontAsset[]
  stylePresets?: Record<string, StylePreset>
}

export interface ImageExportResult {
  /** A single image, or a zip when there are several. */
  blob: Blob
  name: string
  files: number
  /** Cards skipped because they have no back template. */
  noBack: string[]
}

const JPEG_QUALITY = 0.92
const WEBP_QUALITY = 0.92

/** Draw one card side to a canvas at its exact mm size, with or without bleed. */
export async function renderCardImage(
  nodes: RenderNode[],
  o: {
    card: { w: number; h: number }
    bleedMm: number
    withBleed: boolean
    dpi: number
    /** White behind the card (for JPEG, which has no transparency). */
    opaque: boolean
  },
  res: ReturnType<typeof createPrintResources>,
  bands: BleedBands | null,
): Promise<HTMLCanvasElement> {
  const { W, H, B, width, height } = imagePx(o.card, o.bleedMm, o.withBleed, o.dpi)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  if (o.opaque) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  const kx = W / o.card.w
  const ky = H / o.card.h
  ctx.save()
  ctx.translate(B, B)
  ctx.scale(kx, ky)
  const bx = B / kx
  const by = B / ky
  const cell = { x: -bx, y: -by, w: o.card.w + 2 * bx, h: o.card.h + 2 * by }
  await renderCard(new CanvasTarget(ctx), nodes, cell, { x: 0, y: 0, ...o.card }, res)
  ctx.restore()
  if (o.withBleed && B > 0 && bands) {
    const trim = { x: B, y: B, w: W, h: H }
    const p = bands.placement(trim)
    ctx.save()
    ctx.beginPath()
    bleedFramePath(ctx, { x: 0, y: 0, w: width, h: height }, trim)
    ctx.clip()
    ctx.drawImage(await bands.canvas(nodes), p.x, p.y, p.w, p.h)
    ctx.restore()
  }
  return canvas
}

async function encode(canvas: HTMLCanvasElement, f: ImageFile, dpi: number) {
  const fmt = IMAGE_FORMATS.find((x) => x.id === f.format)!
  const quality = f.format === 'jpg' ? JPEG_QUALITY : WEBP_QUALITY
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, fmt.mime, quality))
  // Browsers that can't write a format silently fall back to PNG.
  if (!blob || blob.type !== fmt.mime)
    throw new Error(`This browser can't save ${fmt.label} images. Try PNG or JPG.`)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (f.format === 'png') return pngWithDpi(bytes, dpi)
  if (f.format === 'jpg') return jpegWithDpi(bytes, dpi)
  return bytes
}

/**
 * Export cards as image files (PNG, JPG and/or WebP), trimmed or with bleed.
 * Uses the PDF card renderer, so images match the printed cards, including
 * the bleed fill setting.
 */
export async function exportCardImages(
  input: ImageExportInput,
  options: ImageExportOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<ImageExportResult> {
  const { project } = input
  const bleedFill: BleedFill = normalizePrint(project.print).bleedFill
  const res = createPrintResources(input)
  // Each card at its own size (cards of different size groups can be mixed).
  const bandsBySize = new Map<string, BleedBands | null>()
  const sizedFor = (c: Card) => {
    const card = cardSizeOf(project, input.templates, c)
    const key = `${card.w}x${card.h}`
    if (!bandsBySize.has(key))
      bandsBySize.set(
        key,
        bleedFill !== 'off' && project.bleedMm > 0
          ? new BleedBands(
              { card, bleedMm: project.bleedMm, mode: bleedFill, pxPerMm: options.dpi / 25.4 },
              res,
            )
          : null,
      )
    return { card, bands: bandsBySize.get(key)! }
  }
  const allCards = input.allCards ?? Object.fromEntries(input.cards.map((c) => [c.id, c]))
  const sides = new Map<Card, { front: RenderNode[]; back: RenderNode[] | null }>()
  for (const c of input.cards) {
    const ft = c.frontTemplateId ? input.templates[c.frontTemplateId] : undefined
    const bt = c.backTemplateId ? input.templates[c.backTemplateId] : undefined
    const ctx = cardContext(project, allCards, c.id)
    sides.set(c, resolveCard(c, ft, bt, input.stylePresets, ctx))
  }
  const noBack = new Set<string>()
  const files = imageFiles(input.cards, options).filter((f) => {
    const ok = f.side === 'front' || !!sides.get(f.card)!.back
    if (!ok) noBack.add(f.card.name)
    return ok
  })
  if (!files.length) throw new Error('Nothing to export: the chosen cards have no back.')

  const out: Record<string, Uint8Array> = {}
  // Render once per card side and bleed choice; encode each format from that canvas.
  const groups = new Map<string, ImageFile[]>()
  for (const f of files) {
    const key = `${f.card.id}|${f.side}|${f.withBleed}|${f.format === 'jpg'}`
    groups.set(key, [...(groups.get(key) ?? []), f])
  }
  let done = 0
  for (const group of groups.values()) {
    const f0 = group[0]
    const nodes = sides.get(f0.card)![f0.side as Side]!
    const { card, bands } = sizedFor(f0.card)
    const canvas = await renderCardImage(
      nodes,
      {
        card,
        bleedMm: project.bleedMm,
        withBleed: f0.withBleed,
        dpi: options.dpi,
        opaque: f0.format === 'jpg',
      },
      res,
      bands,
    )
    for (const f of group) {
      out[f.name] = await encode(canvas, f, options.dpi)
      onProgress?.(++done, files.length)
    }
  }

  const names = Object.keys(out)
  const base = project.name.replace(/[^\w\- ]+/g, '').trim() || 'cards'
  if (names.length === 1) {
    const f = files[0]
    const mime = IMAGE_FORMATS.find((x) => x.id === f.format)!.mime
    const name = input.cards.length === 1 ? f.name : `${base} - ${f.name}`
    return {
      blob: new Blob([out[names[0]] as Uint8Array<ArrayBuffer>], { type: mime }),
      name,
      files: 1,
      noBack: [...noBack],
    }
  }
  // Images are already compressed; store them in the zip as they are.
  const zip = zipSync(Object.fromEntries(names.map((n) => [n, [out[n], { level: 0 }] as const])))
  return {
    blob: new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
    name: `${base} - card images.zip`,
    files: names.length,
    noBack: [...noBack],
  }
}
