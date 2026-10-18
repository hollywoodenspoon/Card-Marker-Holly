import type { CardSize } from '../model/types'
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
