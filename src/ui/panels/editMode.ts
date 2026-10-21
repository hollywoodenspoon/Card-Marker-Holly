import { setView, useEditor } from '@/core/editor/editorStore'
import { activeTemplate, currentCard } from '@/core/editor/selectors'
import { useUi } from '@/ui/uiStore'

/** The template that template mode should open: the one shown, else the current card's for this side. */
function templateTarget(): string | null {
  const s = useEditor.getState()
  const card = currentCard(s)
  return (
    activeTemplate(s)?.id ??
    (card ? (s.view.side === 'front' ? card.frontTemplateId : card.backTemplateId) : null) ??
    Object.values(s.doc?.templates ?? {}).find((t) => t.side === s.view.side)?.id ??
    null
  )
}

/**
 * Card or template mode. The left pane's Templates / Cards tabs, the top bar's
 * Card / Template switch and the phone sheets all go through here. Returns
 * false when there is no template to edit (template mode is then not entered).
 */
export function setEditMode(mode: 'card' | 'template'): boolean {
  const reset = { selection: [], editingTextId: null, cropId: null }
  if (mode === 'card') {
    if (useEditor.getState().view.mode !== 'card') setView({ mode: 'card', ...reset })
    return true
  }
  const id = templateTarget()
  if (!id) return false
  const v = useEditor.getState().view
  if (v.mode !== 'template' || v.templateId !== id)
    setView({ mode: 'template', templateId: id, ...reset })
  return true
}

/**
 * Keep the left pane's tab in step with the mode when the mode changes some
 * other way (Edit on a template, picking a card). Decks and Fonts are left alone.
 */
export function followModeWithTabs(): () => void {
  return useEditor.subscribe((s, prev) => {
    if (s.view.mode === prev.view.mode) return
    const ui = useUi.getState()
    if (s.view.mode === 'template' && ui.leftTab === 'cards') ui.setLeftTab('templates')
    if (s.view.mode === 'card' && ui.leftTab === 'templates') ui.setLeftTab('cards')
  })
}
