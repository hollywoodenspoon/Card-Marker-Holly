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
      return {
        card,
        copies,
        front: resolveSide(ft, card, 'front', 'card', input.stylePresets),
        back: bt ? resolveSide(bt, card, 'back', 'card', input.stylePresets) : null,
      }
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
