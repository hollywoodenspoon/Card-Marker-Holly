import { useEffect } from 'react'
import { playtestDb } from '@/playtest/library'
import { usePlaytest } from './table/usePlaytest'

/** Undo steps kept with a saved game. */
const SAVED_HISTORY = 100

/** Keep the open game saved per pack (debounced); New game removes the saved one. */
export function useGameAutosave(packId: string | null) {
  useEffect(() => {
    if (!packId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const save = () => {
      const { setup, state, past, packId: owner } = usePlaytest.getState()
      const db = playtestDb()
      if (owner !== packId) return
      if (!setup || !state) return void db.games.delete(packId)
      void db.games.put({
        packId,
        setup,
        state,
        past: past.slice(-SAVED_HISTORY),
        savedAt: Date.now(),
      })
    }
    const unsub = usePlaytest.subscribe((s, prev) => {
      if (s.state === prev.state && s.setup === prev.setup) return
      // New game on this pack: forget the saved one right away.
      if (prev.packId === packId && s.packId === packId && !s.state)
        return void playtestDb().games.delete(packId)
      clearTimeout(timer)
      timer = setTimeout(save, 400)
    })
    const flush = () => {
      if (timer) save()
    }
    window.addEventListener('pagehide', flush)
    return () => {
      clearTimeout(timer)
      flush()
      unsub()
      window.removeEventListener('pagehide', flush)
    }
  }, [packId])
}
