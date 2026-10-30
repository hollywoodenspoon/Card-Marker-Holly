/**
 * Keyboard shortcuts for the engine editor, following the card editor's harness
 * (src/ui/actions/useShortcuts.ts): ignore keys while typing in a field or while
 * a dialog is open, and leave the browser's own combos alone.
 * - Space: play the game (Shift+Space: from the open scene).
 * - In a map scene: T / P / E for the Terrain, Paint and Tile modes (O is kept for Objects).
 * - [ and ]: the active pane's FOV, 5° at a time.
 * - , and .: turn the Game camera a quarter turn (E belongs to Tile mode).
 * - Ctrl/Cmd+Z, Shift+Z, Y: undo and redo (the map in a map scene, otherwise the game).
 *   Delete: remove the inspected tile or block.
 */
import { useEffect } from 'react'
import { isActive } from '@/app/workspace'
import { overlayOpen } from '@/ui/components/overlay'
import { viewportApi } from './scene/viewportApi'
import { FOV_STEP } from './scene/viewMath'
import { type Mode, useEngine } from './store/engineStore'
import { openScene, useGame } from './store/gameStore'
import { playGame } from './runtime/play'
import { useRuntime } from './runtime/runtime'
import { removeOverhang, removeTile } from './tools/edit'

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

const MODE_KEYS: Record<string, Mode> = { t: 'terrain', p: 'paint', e: 'tile' }

export function useEngineShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActive('engine') || isTyping(e) || overlayOpen()) return
      if (useRuntime.getState().running) return
      const s = useEngine.getState()
      const map = openScene(useGame.getState())?.kind === 'map'
      const history = map ? s : useGame.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) history.redo()
        else history.undo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        history.redo()
        return
      }
      if (mod || e.altKey) return
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        playGame(e.shiftKey)
        return
      }
      if (!map) return
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
