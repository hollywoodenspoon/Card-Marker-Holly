import { useEffect } from 'react'
import { playtestDb } from '@/playtest/library'
import { keepReplay } from './table/replays'
import { usePlaytest } from './table/usePlaytest'

/** Undo steps kept with a saved game. */
const SAVED_HISTORY = 100

/** Keep the open game saved per pack (debounced); New game removes the saved one. */
export function useGameAutosave(packId: string | null) {
  useEffect(() => {
    if (!packId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const save = () => {
      const {
        setup,
        state,
        past,
        packId: owner,
        rules,
        rulesPast,
        viewer,
        bots,
        game,
        moves,
        replay,
      } = usePlaytest.getState()
      const db = playtestDb()
      // A replay on screen isn't the game: the game waits, saved as it was.
      if (owner !== packId || replay) return
      if (!setup || !state) return void db.games.delete(packId)
      void db.games.put({
        packId,
        setup,
        state,
        past: rules ? [] : past.slice(-SAVED_HISTORY),
        ...(rules && {
          rules: {
            state: rules,
            past: rulesPast.slice(-SAVED_HISTORY),
            viewer,
            bots,
            ...(game && { game, moves }),
          },
        }),
        savedAt: Date.now(),
      })
    }
    const unsub = usePlaytest.subscribe((s, prev) => {
      if (s.replay || prev.replay) return
      if (s.state === prev.state && s.setup === prev.setup && s.viewer === prev.viewer) return
      // New game on this pack: forget the saved one right away.
      if (prev.packId === packId && s.packId === packId && !s.state)
        return void playtestDb().games.delete(packId)
      clearTimeout(timer)
      timer = setTimeout(save, 400)
    })
    // A game that ends is kept as a replay.
    const unsubWin = usePlaytest.subscribe((s, prev) => {
      if (s.replay || s.packId !== packId) return
      if (s.rules?.winner && !prev.rules?.winner) void keepReplay()
    })
    const flush = () => {
      if (timer) save()
    }
    window.addEventListener('pagehide', flush)
    return () => {
      clearTimeout(timer)
      flush()
      unsub()
      unsubWin()
      window.removeEventListener('pagehide', flush)
    }
  }, [packId])
}
