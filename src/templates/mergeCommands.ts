import { commit, setView, useEditor } from '@/core/editor/editorStore'
import { sortedCards } from '@/core/editor/selectors'
import { createCard } from '@/core/model/factories'
import { walk } from '@/core/model/tree'
import type { Id, MergeSettings } from '@/core/model/types'
import type { MergePlan } from './mailMerge'

/** Remember the merge dialog's choices on the project (undoable, kept in backups). */
export function setMergeSettings(patch: Partial<MergeSettings>, coalesce?: string) {
  commit((d) => {
    d.project.merge = { ...d.project.merge, ...patch }
  }, coalesce)
}

/** Set (or clear) the spreadsheet column of template fields: templateId → elementId → letter. */
export function setMergeColumns(changes: Record<Id, Record<Id, string | undefined>>) {
  commit((d) => {
    for (const [tid, byEl] of Object.entries(changes)) {
      const t = d.templates[tid]
      if (!t) continue
      walk(t.elements, (e) => {
        if (!(e.id in byEl) || !('fieldName' in e)) return
        const v = byEl[e.id]
        if (v) e.mergeColumn = v
        else delete e.mergeColumn
      })
      t.updatedAt = Date.now()
    }
  })
}

/**
 * Apply a planned merge in one undo step: update the matched cards (only the
 * values the sheet sets), add the new ones after the last card.
 */
export function runMerge(plan: MergePlan) {
  const s = useEditor.getState()
  if (!s.doc || !plan.cards.length) return { updated: 0, added: 0 }
  const cards = sortedCards(s)
  let order = (cards[cards.length - 1]?.order ?? 0) + 1
  const now = Date.now()
  let firstId: Id | undefined
  commit((d) => {
    const copies = { ...d.project.print.copies }
    for (const p of plan.cards) {
      let id = p.cardId
      if (id && d.cards[id]) {
        const c = d.cards[id]
        Object.assign(c.fields, p.values)
        if (p.name) c.name = p.name
        c.frontTemplateId = p.frontTemplateId
        c.backTemplateId = p.backTemplateId
        c.updatedAt = now
      } else {
        const c = createCard(
          d.project.id,
          order++,
          p.frontTemplateId,
          p.backTemplateId,
          p.name ?? `Row ${p.row}`,
        )
        c.fields = p.values
        c.mergeRow = p.row
        d.cards[c.id] = c
        id = c.id
      }
      firstId ??= id
      if (p.copies !== undefined) copies[id] = p.copies
    }
    d.project.print = { ...d.project.print, copies }
  })
  if (firstId) setView({ cardId: firstId, mode: 'card', selection: [], editingTextId: null })
  return { updated: plan.updates, added: plan.adds }
}
