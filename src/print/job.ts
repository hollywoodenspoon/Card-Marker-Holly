import type { Asset, Card, FontAsset, Project, StylePreset, Template } from '@/core/model/types'
import type { RenderNode } from '@/core/render/renderTypes'
import { resolveSide } from '@/templates/resolve'
import { PAPERS } from './paper'
import { computeSheet, paginate, type Sheet } from './layout'
import { printEntries, printSlots } from './printList'
import { normalizePrint, type FullPrintSettings } from './settings'

export interface PrintCard {
  card: Card
  copies: number
  front: RenderNode[]
  /** null when the card has no back template. */
  back: RenderNode[] | null
}

export interface PrintJob {
  project: Project
  settings: FullPrintSettings
  sheet: Sheet
  cards: PrintCard[]
  /** Indices into `cards` for each cell of each sheet (a card repeats for copies). */
  pages: number[][]
  /** Total cards printed, copies included. */
  copyCount: number
  assets: Record<string, Asset>
  fonts: FontAsset[]
}

interface Resolved {
  front?: Template
  back?: Template
  presets?: Record<string, StylePreset>
  nodes: Pick<PrintCard, 'front' | 'back'>
}
/**
 * Resolved sides per card, reused while the card, its templates and the styles
 * are unchanged. Stable node arrays let renderers cache per card side
 * (e.g. auto-bleed bands) across print-setting changes.
 */
const resolvedCache = new WeakMap<Card, Resolved>()

function resolveCard(
  card: Card,
  front: Template | undefined,
  back: Template | undefined,
  presets: Record<string, StylePreset> | undefined,
) {
  const hit = resolvedCache.get(card)
  if (hit && hit.front === front && hit.back === back && hit.presets === presets) return hit.nodes
  const nodes = {
    front: resolveSide(front, card, 'front', 'card', presets),
    back: back ? resolveSide(back, card, 'back', 'card', presets) : null,
  }
  resolvedCache.set(card, { front, back, presets, nodes })
  return nodes
}

/** Everything needed to preview or export the print sheets, from the open project. */
export function buildPrintJob(input: {
  project: Project
  templates: Record<string, Template>
  cards: Card[]
  assets: Record<string, Asset>
  fonts: FontAsset[]
  stylePresets?: Record<string, StylePreset>
}): PrintJob {
  const settings = normalizePrint(input.project.print)
  const size = input.project.defaultSize
  const sheet = computeSheet({
    paper: PAPERS[settings.paper],
    card: { w: size.widthMm, h: size.heightMm },
    bleedMm: input.project.bleedMm,
    marginMm: settings.marginMm,
    orientation: settings.orientation,
    cutMarks: settings.cutMarks,
    markLengthMm: settings.markLengthMm,
    markOffsetMm: settings.markOffsetMm,
  })
  const cards = printEntries(input.cards, settings)
    .filter((e) => e.copies > 0)
    .map(({ card, copies }) => {
      const ft = card.frontTemplateId ? input.templates[card.frontTemplateId] : undefined
      const bt = card.backTemplateId ? input.templates[card.backTemplateId] : undefined
      return { card, copies, ...resolveCard(card, ft, bt, input.stylePresets) }
    })
  const slots = printSlots(cards)
  return {
    project: input.project,
    settings,
    sheet,
    cards,
    pages: paginate(slots.length, sheet.perSheet).map((page) => page.map((i) => slots[i])),
    copyCount: slots.length,
    assets: input.assets,
    fonts: input.fonts,
  }
}
