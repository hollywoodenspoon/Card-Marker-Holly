import { useMemo } from 'react'
import { usePack } from './packContext'
import { stageFrame, stageLayout, type Stage } from './stage'
import { usePlaytest } from './usePlaytest'

/** The Engagement on screen, laid out (null: no Engagement now, or Rush). */
export function useStage(): Stage | null {
  const rules = usePlaytest((s) => s.rules)
  const playback = usePlaytest((s) => s.playback)
  const replay = usePlaytest((s) => s.replay)
  const rush = usePlaytest((s) => s.speed === 'rush' && !s.replay)
  const size = usePack().info.cardSize
  return useMemo(() => {
    if (rush && !playback) return null
    const at = replay
      ? stageFrame(replay.frames, replay.i)
      : playback
        ? stageFrame([playback.from, ...playback.frames], playback.i + 1)
        : rules && stageFrame([rules], 0)
    if (!at) return null
    // Stage cards stand upright: the pack's size, portrait.
    const w = Math.min(size.w, size.h)
    const h = Math.max(size.w, size.h)
    return stageLayout(at.s, at.e, { w, h })
  }, [rules, playback, replay, rush, size])
}

/** The ids of the cards on the stage (drawn faint on the table). */
export const stagedIds = (st: Stage | null) =>
  new Set(st ? [...st.atk.cards, ...st.def.cards].map((c) => c.id) : [])
