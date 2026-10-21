import { useEffect, useState } from 'react'
import { actor } from '@/adventure/engine'
import { toast } from '@/ui/components/feedback'
import { askBot } from './botClient'
import { usePlaytest, type BotSpeed } from './usePlaytest'

/** How long a bot's move stays on screen before the next one (ms). */
export const BOT_DELAY: Record<BotSpeed, number> = { slow: 1600, normal: 750, fast: 120 }

/**
 * Plays the bot's moves while a bot seat is to act: asks the worker, waits so
 * the move can be followed, then plays it (unless the game moved on). Paused,
 * `step()` plays a single move.
 */
export function useBotDriver() {
  const rules = usePlaytest((s) => s.rules)
  const bots = usePlaytest((s) => s.bots)
  const paused = usePlaytest((s) => s.botPaused)
  const speed = usePlaytest((s) => s.botSpeed)
  const [stepTick, setStepTick] = useState(0)
  const seat = rules ? actor(rules) : null
  const level = seat === null ? null : bots[seat]

  useEffect(() => {
    if (!rules || !level || (paused && stepTick === 0)) return
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
  }, [rules, level, paused, speed, stepTick])

  return { botToAct: !!level, step: () => setStepTick((t) => t + 1) }
}
