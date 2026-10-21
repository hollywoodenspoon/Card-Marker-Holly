import { commit } from '@/core/editor/editorStore'
import type { CardSize, Id } from '@/core/model/types'
import { groupOf, resizeTemplate, sameSize } from './sizeGroups'

/**
 * Resize a template's size group: its back and every front anchored to that
 * back share one size so they print back to back. Other groups keep theirs.
 * The size also becomes the default for new templates. Parts keep their mm
 * positions; backgrounds that cover the whole card stretch with it.
 */
export function setGroupSize(templateId: Id, size: CardSize, coalesce?: string) {
  commit((d) => {
    d.project.defaultSize = size
    for (const t of groupOf(d.templates, templateId)) {
      resizeTemplate(t, size, d.project.bleedMm)
      t.updatedAt = Date.now()
    }
  }, coalesce)
}

/**
 * Anchor a front to another back. The front joins that back's size group (it
 * takes the back's size), and its cards switch to the new back when their
 * current one no longer fits.
 */
export function setFrontAnchor(frontId: Id, backId: Id) {
  commit((d) => {
    const f = d.templates[frontId]
    const b = d.templates[backId]
    if (!f || !b || f.side !== 'front' || b.side !== 'back') return
    f.backId = backId
    if (!sameSize(f.size, b.size)) resizeTemplate(f, b.size, d.project.bleedMm)
    f.updatedAt = Date.now()
    for (const c of Object.values(d.cards)) {
      if (c.frontTemplateId !== frontId) continue
      const back = c.backTemplateId ? d.templates[c.backTemplateId] : undefined
      if (!back || !sameSize(back.size, f.size)) {
        c.backTemplateId = backId
        c.updatedAt = Date.now()
      }
    }
  })
}
