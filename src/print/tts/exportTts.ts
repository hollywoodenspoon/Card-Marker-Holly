import { zipSync } from 'fflate'
import { fieldNames, flatten } from '@/core/model/tree'
import type { Id } from '@/core/model/types'
import type { ImageExportInput } from '../image/exportImages'
import { renderCardImage } from '../image/exportImages'
import { buildPrintJob, type PrintCard } from '../job'
import { printSlots } from '../printList'
import { createPrintResources } from '../pdf/resources'
import { TTS_COLS, TTS_ROWS, ttsCardPx, ttsSheets, ttsSlotPos } from './ttsLayout'

const QUALITY = 0.9

export interface TtsResult {
  blob: Blob
  name: string
  cards: number
  sheets: number
  uniqueBacks: boolean
}

/** Does every card show exactly the same back (same template, nothing card-specific on it)? */
function sharedBack(cards: PrintCard[], templates: ImageExportInput['templates']) {
  const first = cards[0]?.card.backTemplateId ?? null
  return cards.every(({ card }) => {
    if (card.backTemplateId !== first || card.local.back.length) return false
    const t = first ? templates[first] : undefined
    if (!t) return true
    const ids = new Set(flatten(t.elements).map((e) => e.id))
    return (
      fieldNames(t.elements).every((f) => !(f in card.fields)) &&
      Object.keys(card.overrides).every((id) => !ids.has(id))
    )
  })
}

const toJpeg = async (c: HTMLCanvasElement) =>
  new Uint8Array(
    await (
      await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', QUALITY))
    ).arrayBuffer(),
  )

const howTo = (name: string, sheets: number, total: number, unique: boolean) =>
  `Importing "${name}" into Tabletop Simulator
==========================================

1. In Tabletop Simulator: Objects > Components > Custom > Deck, then click the table to place it.
2. Face: choose "${name} faces 1.jpg"${sheets > 1 ? ` (make one deck per sheet: faces 1 to ${sheets})` : ''}.
3. Back: choose ${unique ? `"${name} backs 1.jpg" (the matching backs sheet) and tick "Unique backs"` : `"${name} back.jpg"`}.
4. Width 10, Height 7, Number: the number of cards on that sheet (${total} in total; 69 per full sheet).
5. Tick "Back is hidden" (the last slot of each sheet holds the hidden face).
6. Import.

Files on your computer work for playing alone. To play with others, upload them
first (Tabletop Simulator: Modding > Cloud Manager) or use links to hosted images.
`

/**
 * Deck sheets for Tabletop Simulator: 10 × 7 grids of card fronts (69 cards
 * per sheet), plus one shared back image or matching back sheets. Copies come
 * from a deck's counts or the print list.
 */
export async function exportTts(
  input: ImageExportInput,
  deckId: Id | null,
  onProgress?: (done: number, total: number) => void,
): Promise<TtsResult> {
  const { project } = input
  const job = buildPrintJob({
    ...input,
    // Full-colour, all art: the draft options are for paper only.
    project: { ...project, print: { ...project.print, deckId, draftNoArt: false } },
  })
  // Copies in print order (independent of whether cards fit the paper).
  const slots = printSlots(job.cards)
  if (!slots.length) throw new Error('No cards to export. Add cards to the deck or the print list.')
  const card = { w: project.defaultSize.widthMm, h: project.defaultSize.heightMm }
  const px = ttsCardPx(card)
  const res = createPrintResources(input)
  const opts = { card, bleedMm: 0, withBleed: false, dpi: px.dpi, opaque: true }
  const unique = !sharedBack(job.cards, input.templates)
  const cache = new Map<string, HTMLCanvasElement>()
  const image = async (i: number, side: 'front' | 'back') => {
    const key = `${i}:${side}`
    let c = cache.get(key)
    if (!c) {
      const pc = job.cards[i]
      const nodes = side === 'front' ? pc.front : (pc.back ?? [])
      c = await renderCardImage(nodes, opts, res, null)
      cache.set(key, c)
    }
    return c
  }
  const sheets = ttsSheets(slots)
  const total = sheets.length * (unique ? 2 : 1) + (unique ? 0 : 1)
  let done = 0
  const sheet = async (cardsOnSheet: number[], side: 'front' | 'back') => {
    const canvas = document.createElement('canvas')
    canvas.width = TTS_COLS * px.w
    canvas.height = TTS_ROWS * px.h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const [slot, i] of cardsOnSheet.entries()) {
      const p = ttsSlotPos(slot, px)
      ctx.drawImage(await image(i, side), p.x, p.y, px.w, px.h)
    }
    // Last slot: the face shown while a card is hidden (its back).
    const last = ttsSlotPos(TTS_COLS * TTS_ROWS - 1, px)
    ctx.drawImage(await image(cardsOnSheet[0], 'back'), last.x, last.y, px.w, px.h)
    onProgress?.(++done, total)
    return toJpeg(canvas)
  }

  const base = project.name.replace(/[^\w\- ]+/g, '').trim() || 'cards'
  const name = job.deck ? `${base} - ${job.deck.name.replace(/[^\w\- ]+/g, '').trim()}` : base
  const files: Record<string, [Uint8Array, { level: 0 }]> = {}
  for (const [n, s] of sheets.entries()) {
    files[`${name} faces ${n + 1}.jpg`] = [await sheet(s, 'front'), { level: 0 }]
    if (unique) files[`${name} backs ${n + 1}.jpg`] = [await sheet(s, 'back'), { level: 0 }]
  }
  if (!unique) {
    files[`${name} back.jpg`] = [await toJpeg(await image(slots[0], 'back')), { level: 0 }]
    onProgress?.(++done, total)
  }
  const text = new TextEncoder().encode(howTo(name, sheets.length, slots.length, unique))
  const zip = zipSync({ ...files, 'How to import.txt': text })
  return {
    blob: new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
    name: `${name} - Tabletop Simulator.zip`,
    cards: slots.length,
    sheets: sheets.length,
    uniqueBacks: unique,
  }
}
