/**
 * Keyboard shortcuts for the engine editor, following the card editor's harness
 * (src/ui/actions/useShortcuts.ts): ignore keys while typing in a field or while
 * a dialog is open, and leave the browser's own combos alone.
 * - T / P / E: Terrain, Paint, Tile modes (O and Space are kept for Objects and Play).
 * - [ and ]: the active pane's FOV, 5° at a time.
 * - , and .: turn the Game camera a quarter turn (E belongs to Tile mode).
 * - Ctrl/Cmd+Z, Shift+Z, Y: undo and redo. Delete: remove the inspected tile or block.
 */
import { useEffect } from 'react'
import { overlayOpen } from '@/ui/components/overlay'
import { viewportApi } from './scene/viewportApi'
import { FOV_STEP } from './scene/viewMath'
import { type Mode, useEngine } from './store/engineStore'
import { removeOverhang, removeTile } from './tools/edit'

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

const MODE_KEYS: Record<string, Mode> = { t: 'terrain', p: 'paint', e: 'tile' }

export function useEngineShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || overlayOpen()) return
      const s = useEngine.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        s.redo()
        return
      }
      if (mod || e.altKey) return
      if (MODE_KEYS[key]) {
        s.setMode(MODE_KEYS[key])
        return
      }
      if (e.key === '[' || e.key === ']') {
        e.preventDefault()
        viewportApi.fovStep(e.key === '[' ? -FOV_STEP : FOV_STEP)
        return
      }
      if (e.key === ',' || e.key === '.') {
        viewportApi.turn(e.key === ',' ? -1 : 1)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selection) {
        e.preventDefault()
        const sel = s.selection
        s.commit((m) =>
          sel.overhang ? removeOverhang(m, sel.overhang) : removeTile(m, sel.x, sel.z),
        )
        s.endStroke()
        s.setSelection(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
