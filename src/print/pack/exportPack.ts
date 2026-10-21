import { flatten } from '@/core/model/tree'
import type { Card, Template } from '@/core/model/types'
import { plainText } from '@/core/text/richtext'
import { buildPack, PACK_EXT, type PackValue } from '@/playtest/pack'
import { cardContext } from '@/templates/cardContext'
import { isField } from '@/templates/fields'
import { countValueFor, textValueFor } from '@/templates/resolve'
import type { ImageExportInput } from '../image/exportImages'
import { renderCardImage } from '../image/exportImages'
import { resolveCard } from '../job'
import { createPrintResources } from '../pdf/resources'

/** Sharp enough to read when zoomed in on a phone, small enough for a big card pool. */
const DPI = 200
const QUALITY = 0.88

/**
 * A card's field values by field name, as plain values: text fields as plain
 * text, icon rows as their count. Picture fields are left out. Fields on
 * hidden layers are included (a game can keep data on the card that is never
 * printed).
 */
export function packFieldValues(card: Card, templates: Record<string, Template>) {
  const out: Record<string, PackValue> = {}
  const ids = [card.frontTemplateId, card.backTemplateId]
  const els = [
    ...ids.flatMap((id) => (id && templates[id] ? flatten(templates[id].elements) : [])),
    ...flatten(card.local.front),
    ...flatten(card.local.back),
  ]
  for (const el of els) {
    if (!isField(el) || el.fieldName in out) continue
    if (el.type === 'text') out[el.fieldName] = plainText(textValueFor(el, card).text)
    else if (el.type === 'iconRow') out[el.fieldName] = countValueFor(el, card)
  }
  return out
}

export interface PackExport {
  bytes: Uint8Array
  name: string
  cards: number
}

const jpeg = async (c: HTMLCanvasElement) =>
  new Uint8Array(
    await (
      await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', QUALITY))
    ).arrayBuffer(),
  )

/** The project's whole card pool and its decks as a game pack for the Playtest app. */
export async function exportGamePack(
  input: ImageExportInput,
  appVersion: string,
  onProgress?: (done: number, total: number) => void,
): Promise<PackExport> {
  const { project, templates } = input
  const cards = input.cards.slice().sort((a, b) => a.order - b.order)
  if (!cards.length) throw new Error('There are no cards to export.')
  const byId = input.allCards ?? Object.fromEntries(cards.map((c) => [c.id, c]))
  const res = createPrintResources(input)
  const def = project.defaultSize
  const out: Parameters<typeof buildPack>[0]['cards'] = []
  for (const [i, card] of cards.entries()) {
    const ft = card.frontTemplateId ? templates[card.frontTemplateId] : undefined
    const bt = card.backTemplateId ? templates[card.backTemplateId] : undefined
    const size = ft?.size ?? bt?.size ?? def
    const sides = resolveCard(card, ft, bt, input.stylePresets, cardContext(project, byId, card.id))
    const opts = {
      card: { w: size.widthMm, h: size.heightMm },
      bleedMm: 0,
      withBleed: false,
      dpi: DPI,
      opaque: true,
    }
    out.push({
      id: card.id,
      name: card.name || `Card ${i + 1}`,
      w: size.widthMm,
      h: size.heightMm,
      fields: packFieldValues(card, templates),
      front: await jpeg(await renderCardImage(sides.front, opts, res, null)),
      back: sides.back ? await jpeg(await renderCardImage(sides.back, opts, res, null)) : null,
    })
    onProgress?.(i + 1, cards.length)
  }
  const bytes = await buildPack({
    name: project.name,
    projectId: project.id,
    exportedAt: Date.now(),
    appVersion,
    // Built-in tables are laid out for the largest card, so every size fits.
    cardSize: out.reduce((m, c) => (c.w * c.h > m.w * m.h ? { w: c.w, h: c.h } : m), {
      w: out[0].w,
      h: out[0].h,
    }),
    cards: out,
    decks: (project.decks ?? []).map((d) => ({ name: d.name, counts: d.counts })),
  })
  const base = project.name.replace(/[^\w\- ]+/g, '').trim() || 'cards'
  return { bytes, name: `${base} - game pack${PACK_EXT}`, cards: out.length }
}
