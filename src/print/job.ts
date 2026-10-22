import type {
  Asset,
  Card,
  Deck,
  FontAsset,
  Project,
  StylePreset,
  Template,
} from '@/core/model/types'
import type { RenderNode } from '@/core/render/renderTypes'
import { cardContext } from '@/templates/cardContext'
import { resolveSide, type ResolveContext } from '@/templates/resolve'
import { stripArt } from './draft'
import { paperOf } from './paper'
import { computeSheet, paginate, type Sheet, type SheetInput } from './layout'
import { printEntries, printSlots } from './printList'
import { normalizePrint, type FullPrintSettings } from './settings'

export interface PrintCard {
  card: Card
  copies: number
  front: RenderNode[]
  /** null when the card has no back template. */
  back: RenderNode[] | null
}

/** Cards of one size, printed on their own sheets with their own grid. */
export interface PrintGroup {
  card: { w: number; h: number }
  sheet: Sheet
  /** Indices into `cards`, in print order. */
  cards: number[]
}

export interface PrintJob {
  project: Project
  settings: FullPrintSettings
  /** The first size group's sheet (the project's default size when nothing prints). */
  sheet: Sheet
  /** One per card size, in the order the sizes first appear in the print list. */
  groups: PrintGroup[]
  cards: PrintCard[]
  /** Indices into `cards` for each cell of each sheet (a card repeats for copies). */
  pages: number[][]
  /** Index into `groups` for each page. */
  pageGroup: number[]
  /** Total cards printed, copies included. */
  copyCount: number
  /** The deck being printed, if any (otherwise the print list). */
  deck?: Deck
  /** Which sheets the PDF contains (backs only when some card has a back). */
  sides: { fronts: boolean; backs: boolean }
  assets: Record<string, Asset>
  fonts: FontAsset[]
}

interface Resolved {
  front?: Template
  back?: Template
  presets?: Record<string, StylePreset>
  ctx: ResolveContext
  nodes: Pick<PrintCard, 'front' | 'back'>
}
/**
 * Resolved sides per card, reused while the card, its templates and the styles
 * are unchanged. Stable node arrays let renderers cache per card side
 * (e.g. auto-bleed bands) across print-setting changes.
 */
const resolvedCache = new WeakMap<Card, Resolved>()

export function resolveCard(
  card: Card,
  front: Template | undefined,
  back: Template | undefined,
  presets: Record<string, StylePreset> | undefined,
  ctx: ResolveContext = {},
) {
  const hit = resolvedCache.get(card)
  if (
    hit &&
    hit.front === front &&
    hit.back === back &&
    hit.presets === presets &&
    hit.ctx.number === ctx.number &&
    hit.ctx.total === ctx.total &&
    hit.ctx.keywords === ctx.keywords
  )
    return hit.nodes
  const nodes = {
    front: resolveSide(front, card, 'front', 'card', presets, ctx),
    back: back ? resolveSide(back, card, 'back', 'card', presets, ctx) : null,
  }
  resolvedCache.set(card, { front, back, presets, ctx, nodes })
  return nodes
}

/** Sheet layout input from the project and its print settings, for one card size. */
export function sheetInput(
  project: Project,
  settings: FullPrintSettings,
  card = { w: project.defaultSize.widthMm, h: project.defaultSize.heightMm },
): SheetInput {
  return {
    paper: paperOf(settings.paper),
    card,
    bleedMm: project.bleedMm,
    marginMm: settings.marginMm,
    orientation: settings.orientation,
    cutMarks: settings.cutMarks,
    bleedMarks: settings.bleedMarks,
    markLengthMm: settings.markLengthMm,
    markOffsetMm: settings.markOffsetMm,
    gapMm: settings.gapMm,
  }
}

/** A card's printed size: its front template's, else its back's, else the project default. */
export function cardSizeOf(project: Project, templates: Record<string, Template>, card: Card) {
  const t =
    (card.frontTemplateId && templates[card.frontTemplateId]) ||
    (card.backTemplateId && templates[card.backTemplateId]) ||
    undefined
  const size = t ? t.size : project.defaultSize
  return { w: size.widthMm, h: size.heightMm }
}

/** Cards grouped by size, each group with its own sheet layout. */
function sizeGroups(
  project: Project,
  settings: FullPrintSettings,
  templates: Record<string, Template>,
  cards: PrintCard[],
): PrintGroup[] {
  const groups = new Map<string, PrintGroup>()
  cards.forEach((c, i) => {
    const size = cardSizeOf(project, templates, c.card)
    const key = `${size.w}x${size.h}`
    let g = groups.get(key)
    if (!g) {
      g = { card: size, sheet: computeSheet(sheetInput(project, settings, size)), cards: [] }
      groups.set(key, g)
    }
    g.cards.push(i)
  })
  return [...groups.values()]
}

/** The sheet layout of one page of the job. */
export const pageSheet = (job: PrintJob, page: number): Sheet =>
  job.groups[job.pageGroup[page]]?.sheet ?? job.sheet

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
  const byId = Object.fromEntries(input.cards.map((c) => [c.id, c]))
  const deck = settings.deckId
    ? input.project.decks?.find((d) => d.id === settings.deckId)
    : undefined
  const cards = printEntries(input.cards, settings, deck)
    .filter((e) => e.copies > 0)
    .map(({ card, copies }) => {
      const ft = card.frontTemplateId ? input.templates[card.frontTemplateId] : undefined
      const bt = card.backTemplateId ? input.templates[card.backTemplateId] : undefined
      const ctx = cardContext(input.project, byId, card.id)
      const sides = resolveCard(card, ft, bt, input.stylePresets, ctx)
      if (!settings.draftNoArt) return { card, copies, ...sides }
      return {
        card,
        copies,
        front: stripArt(sides.front),
        back: sides.back && stripArt(sides.back),
      }
    })
  const groups = sizeGroups(input.project, settings, input.templates, cards)
  const pages: number[][] = []
  const pageGroup: number[] = []
  groups.forEach((g, gi) => {
    const slots = printSlots(g.cards.map((i) => cards[i]))
    for (const page of paginate(slots.length, g.sheet.perSheet)) {
      pages.push(page.map((k) => g.cards[slots[k]]))
      pageGroup.push(gi)
    }
  })
  return {
    project: input.project,
    settings,
    sheet: groups[0]?.sheet ?? computeSheet(sheetInput(input.project, settings)),
    groups,
    cards,
    pages,
    pageGroup,
    copyCount: cards.reduce((n, c) => n + c.copies, 0),
    deck,
    sides: {
      fronts: settings.sheets !== 'backs',
      backs: settings.sheets !== 'fronts' && cards.some((c) => c.back),
    },
    assets: input.assets,
    fonts: input.fonts,
  }
}
