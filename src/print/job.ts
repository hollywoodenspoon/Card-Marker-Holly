import type { Asset, Card, FontAsset, Project, Template } from '@/core/model/types'
import type { RenderNode } from '@/core/render/renderTypes'
import { resolveSide } from '@/templates/resolve'
import { PAPERS } from './paper'
import { computeSheet, paginate, type Sheet } from './layout'
import { normalizePrint, type FullPrintSettings } from './settings'

export interface PrintCard {
  card: Card
  front: RenderNode[]
  /** null when the card has no back template. */
  back: RenderNode[] | null
}

export interface PrintJob {
  project: Project
  settings: FullPrintSettings
  sheet: Sheet
  cards: PrintCard[]
  /** Card indices on each sheet. */
  pages: number[][]
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
  const cards = [...input.cards]
    .sort((a, b) => a.order - b.order)
    .map((card) => {
      const ft = card.frontTemplateId ? input.templates[card.frontTemplateId] : undefined
      const bt = card.backTemplateId ? input.templates[card.backTemplateId] : undefined
      return {
        card,
        front: resolveSide(ft, card, 'front', 'card'),
        back: bt ? resolveSide(bt, card, 'back', 'card') : null,
      }
    })
  return {
    project: input.project,
    settings,
    sheet,
    cards,
    pages: paginate(cards.length, sheet.perSheet),
    assets: input.assets,
    fonts: input.fonts,
  }
}
