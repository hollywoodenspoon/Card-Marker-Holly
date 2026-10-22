import { useEffect, useState } from 'react'
import { actor } from '@/adventure/engine'
import { toast } from '@/ui/components/feedback'
import { askBot } from './botClient'
import { SPEED_MS, usePlaytest, type Speed } from './usePlaytest'

/** A short gap before the bot's next move, after its last one has been shown (ms). */
export const BOT_DELAY: Record<Speed, number> = { slow: 400, normal: 200, fast: 60, rush: 0 }

/**
 * Plays the bot's moves while a bot seat is to act: waits until the last move
 * has been shown, asks the worker, then plays it (unless the game moved on).
 * Paused, `step()` plays a single move.
 */
export function useBotDriver() {
  const rules = usePlaytest((s) => s.rules)
  const bots = usePlaytest((s) => s.bots)
  const paused = usePlaytest((s) => s.botPaused)
  const speed = usePlaytest((s) => s.speed)
  const showing = usePlaytest((s) => !!s.playback || !!s.replay)
  const [stepTick, setStepTick] = useState(0)
  const seat = rules ? actor(rules) : null
  const level = seat === null ? null : bots[seat]

  useEffect(() => {
    if (!rules || !level || showing || (paused && stepTick === 0)) return
    let live = true
    const started = Date.now()
    askBot(rules, level, (rules.seed ^ (rules.log.length * 2654435761)) >>> 0)
      .then((move) => {
        const wait = Math.max(0, BOT_DELAY[speed] - (Date.now() - started))
        setTimeout(() => {
          if (!live || usePlaytest.getState().rules !== rules) return
          setStepTick(0)
          usePlaytest.getState().play(move)
        }, wait)
      })
      .catch((e: Error) => {
        if (!live) return
        usePlaytest.getState().setBotPaused(true)
        toast(`The bot stopped: ${e.message}`)
      })
    return () => {
      live = false
    }
    // A step request is consumed by the move it plays.
  }, [rules, level, paused, speed, stepTick, showing])

  return { botToAct: !!level, step: () => setStepTick((t) => t + 1) }
}

/** Moves the playback and a playing replay on, one action per Action speed. */
export function useFrameTimer() {
  const playback = usePlaytest((s) => s.playback)
  const replay = usePlaytest((s) => s.replay)
  const speed = usePlaytest((s) => s.speed)
  useEffect(() => {
    if (!playback) return
    const t = setTimeout(() => usePlaytest.getState().nextFrame(), SPEED_MS[speed])
    return () => clearTimeout(t)
  }, [playback, speed])
  useEffect(() => {
    if (!replay?.playing) return
    const t = setTimeout(
      () => {
        const r = usePlaytest.getState().replay
        if (!r) return
        if (r.i >= r.frames.length - 1) usePlaytest.getState().setReplayPlaying(false)
        else usePlaytest.getState().seek(r.i + 1)
      },
      Math.max(60, SPEED_MS[speed]),
    )
    return () => clearTimeout(t)
  }, [replay, speed])
}
