/** Changes applied to several cards at once (one undo step each). */
import { commit, setView, useEditor } from '@/core/editor/editorStore'
import { sortedCards } from '@/core/editor/selectors'
import { newId } from '@/core/model/ids'
import { cloneWithNewIds, findElement, uniqueName } from '@/core/model/tree'
import type { Card, Id, Side } from '@/core/model/types'
import { setPartVisibility } from './overrides'
import { fieldDefaults, ruleHolds } from './rules'
import { backFits, switchTemplate } from './switchTemplate'

/**
 * Use one template for one side of every chosen card (values carry over by
 * field name). A new front brings its anchored back; a back is only used on
 * cards whose front has the same size. Returns how many cards were skipped.
 */
export function setTemplateForCards(ids: Id[], side: Side, templateId: Id | null) {
  let skipped = 0
  commit((d) => {
    for (const id of ids) {
      const c = d.cards[id]
      if (!c) continue
      if (side === 'back' && templateId && !backFits(d.templates, c, templateId)) {
        skipped++
        continue
      }
      switchTemplate(c, side, templateId, d.templates)
    }
  })
  return skipped
}

/**
 * Show or hide one template part on every chosen card that uses that part's
 * template. Cards whose template doesn't have the part are left alone.
 */
export function setPartOnCards(ids: Id[], side: Side, elementId: Id, visible: boolean) {
  const s = useEditor.getState()
  if (!s.doc) return
  let changed = 0
  commit((d) => {
    for (const id of ids) {
      const c = d.cards[id]
      const tid = c && (side === 'front' ? c.frontTemplateId : c.backTemplateId)
      const t = tid ? d.templates[tid] : undefined
      const el = t && findElement(t.elements, elementId)
      if (!c || !t || !el) continue
      const base = el.defaultVisible && ruleHolds(el.showIf, c, fieldDefaults(t.elements))
      setPartVisibility(c, el, visible, base)
      c.updatedAt = Date.now()
      changed++
    }
  })
  return changed
}

export function deleteCards(ids: Id[]) {
  const s = useEditor.getState()
  if (!s.doc) return
  const gone = new Set(ids)
  const rest = sortedCards(s).filter((c) => !gone.has(c.id))
  commit((d) => {
    for (const id of ids) delete d.cards[id]
  })
  if (s.view.cardId && gone.has(s.view.cardId))
    setView({ cardId: rest[0]?.id ?? null, selection: [] })
}

/** Copies of the chosen cards, each placed after the last chosen card, in list order. */
export function duplicateCards(ids: Id[]) {
  const s = useEditor.getState()
  if (!s.doc) return
  const cards = sortedCards(s)
  const chosen = cards.filter((c) => ids.includes(c.id))
  if (!chosen.length) return
  const last = chosen[chosen.length - 1]
  const next = cards[cards.findIndex((c) => c.id === last.id) + 1]
  const step = next ? (next.order - last.order) / (chosen.length + 1) : 1
  const names = cards.map((c) => c.name)
  const copies: Card[] = chosen.map((src, i) => {
    const name = uniqueName(`${src.name} copy`, names)
    names.push(name)
    return {
      ...structuredClone(src),
      id: newId(),
      name,
      order: last.order + step * (i + 1),
      mergeRow: undefined,
      local: {
        front: src.local.front.map(cloneWithNewIds),
        back: src.local.back.map(cloneWithNewIds),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  })
  commit((d) => {
    for (const c of copies) d.cards[c.id] = c
  })
  return copies.map((c) => c.id)
}
