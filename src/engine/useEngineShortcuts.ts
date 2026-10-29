/**
 * Keyboard shortcuts for the engine editor, following the card editor's harness
 * (src/ui/actions/useShortcuts.ts): ignore keys while typing in a field or while
 * a dialog is open, and let the browser keep its own combos.
 */
import { useEffect } from 'react'
import { overlayOpen } from '@/ui/components/overlay'
import { removeBlock } from './tools/edit'
import { type Tool, useEngine } from './store/engineStore'

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

const TOOL_KEYS: Record<string, Tool> = { '1': 'select', '2': 'terrain', '3': 'paint', '4': 'tile' }

export function useEngineShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || overlayOpen()) return
      const s = useEngine.getState()
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        s.redo()
        return
      }
      if (mod) return // leave other browser/OS combos alone
      if (TOOL_KEYS[e.key]) {
        s.setTool(TOOL_KEYS[e.key])
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selection) {
        e.preventDefault()
        const cell = s.selection
        s.commit((m) => removeBlock(m, cell))
        s.endStroke()
        s.setSelection(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
