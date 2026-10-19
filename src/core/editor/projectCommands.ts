import type { CardSize, Id, PrintSettings } from '../model/types'
import { commit } from './editorStore'

/**
 * The card size is shared by the whole project (fronts and backs must match
 * to print double-sided), so it updates the default and every template.
 * Elements keep their mm positions.
 */
export function setCardSize(size: CardSize, coalesce?: string) {
  commit((d) => {
    d.project.defaultSize = size
    for (const t of Object.values(d.templates)) {
      t.size = { ...size }
      t.updatedAt = Date.now()
    }
  }, coalesce)
}

export function setBleed(mm: number) {
  commit((d) => {
    d.project.bleedMm = Math.max(0, mm)
  }, 'bleed')
}

export function setSafe(mm: number) {
  commit((d) => {
    d.project.safeMm = Math.max(0, mm)
  }, 'safe')
}

export function setPrintSettings(patch: Partial<PrintSettings>, coalesce?: string) {
  commit((d) => {
    d.project.print = { ...d.project.print, ...patch }
  }, coalesce)
}

// ---------- print list ----------

/** Most copies of one card in a print run. */
export const MAX_COPIES = 99

const clampCopies = (n: number) =>
  Math.max(0, Math.min(MAX_COPIES, Math.round(Number.isFinite(n) ? n : 0)))

export function setCopies(cardId: Id, n: number) {
  commit((d) => {
    d.project.print.copies = { ...d.project.print.copies, [cardId]: clampCopies(n) }
  }, 'print:copies:' + cardId)
}

/**
 * Same copy count for these cards (e.g. 1 = all, 0 = none). With `keepOthers`,
 * other cards keep their counts; otherwise the list is replaced.
 */
export function setAllCopies(cardIds: Id[], n: number, keepOthers = false) {
  commit((d) => {
    const these = Object.fromEntries(cardIds.map((id) => [id, clampCopies(n)]))
    d.project.print.copies = keepOthers ? { ...d.project.print.copies, ...these } : these
  })
}

/** A custom print order, independent of the Cards list; null follows the list. */
export function setPrintOrder(order: Id[] | null) {
  commit((d) => {
    d.project.print.order = order
  })
}

/** Number of the first card for `{#}` card-number tokens. */
export function setNumberStart(n: number) {
  commit((d) => {
    d.project.numberStart = n
  }, 'numberStart')
}

/** Rounded-corner guide for a corner cutter (shown on screen only). */
export function setCornerGuide(patch: Partial<{ enabled: boolean; radiusMm: number }>) {
  commit((d) => {
    d.project.cornerGuide = { enabled: false, radiusMm: 3, ...d.project.cornerGuide, ...patch }
  }, 'cornerGuide')
}
