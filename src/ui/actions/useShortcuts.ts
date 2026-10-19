import { useEffect } from 'react'
import { useUi } from '@/ui/uiStore'
import { redo, setView, undo, useEditor } from '@/core/editor/editorStore'
import {
  deleteSelection,
  duplicateSelection,
  groupSelection,
  nudgeSelection,
  select,
  ungroupSelection,
} from '@/core/editor/elementCommands'
import { surfaceElements } from '@/core/editor/selectors'
import { fitToScreen, zoomIn, zoomOut } from '@/core/render/viewport'

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

/** Desktop keyboard shortcuts. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      // The Vector Maker has its own shortcuts.
      if (useUi.getState().vectorOpen) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      const run = (fn: () => void) => {
        e.preventDefault()
        fn()
      }
      if (mod && k === 'z' && !e.shiftKey) return run(undo)
      if ((mod && k === 'z' && e.shiftKey) || (mod && k === 'y')) return run(redo)
      if (mod && k === 'd') return run(duplicateSelection)
      if (mod && k === 'g' && !e.shiftKey) return run(groupSelection)
      if (mod && k === 'g' && e.shiftKey) return run(ungroupSelection)
      if (mod && k === 'h') return run(() => useUi.getState().setFindOpen(true))
      if (mod && k === 'a')
        return run(() =>
          select(
            surfaceElements(useEditor.getState())
              .filter((x) => !x.editLocked)
              .map((x) => x.id),
          ),
        )
      if (mod && (k === '=' || k === '+')) return run(zoomIn)
      if (mod && k === '-') return run(zoomOut)
      if (mod && k === '0') return run(() => fitToScreen())
      if (k === 'delete' || k === 'backspace') return run(deleteSelection)
      if (k === 'escape')
        return run(() => setView({ selection: [], editingTextId: null, cropId: null }))
      const step = e.shiftKey ? 5 : 0.5
      if (k === 'arrowleft') return run(() => nudgeSelection(-step, 0))
      if (k === 'arrowright') return run(() => nudgeSelection(step, 0))
      if (k === 'arrowup') return run(() => nudgeSelection(0, -step))
      if (k === 'arrowdown') return run(() => nudgeSelection(0, step))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
