import { commit, useEditor } from '@/core/editor/editorStore'
import { updateElements } from '@/core/editor/elementCommands'
import { activeTemplate, ownerOf } from '@/core/editor/selectors'
import { findElement } from '@/core/model/tree'
import { setPartVisibility } from './overrides'
import { isVisibleOnCard } from './resolve'

/**
 * Show/hide toggle from the layers panel:
 * - template mode: the part's default visibility
 * - card mode, template part: a per-card override
 * - card mode, card-only element: its own visibility
 */
export function toggleVisibility(id: string) {
  const s = useEditor.getState()
  const owner = ownerOf(s, id)
  if (!owner) return
  if (s.view.mode === 'card' && owner === 'template') {
    const el = findElement(activeTemplate(s)?.elements ?? [], id)
    const cardId = s.view.cardId
    if (!el || !cardId || el.toggleLocked) return
    const card = s.doc!.cards[cardId]
    const next = !isVisibleOnCard(el, card)
    commit((d) => {
      setPartVisibility(d.cards[cardId], el, next)
      d.cards[cardId].updatedAt = Date.now()
    })
    return
  }
  updateElements([id], (el) => void (el.defaultVisible = !el.defaultVisible))
}

export function toggleEditLock(id: string) {
  updateElements([id], (el) => void (el.editLocked = !el.editLocked))
}

export function renameElement(id: string, name: string) {
  updateElements([id], (el) => {
    el.name = name
  })
}
