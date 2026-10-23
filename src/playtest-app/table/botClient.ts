import type { Move } from '@/adventure/engine'
import type { BotLevel } from '@/adventure/bot'
import type { AsState } from '@/adventure/state'

let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, { resolve: (m: Move) => void; reject: (e: Error) => void }>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../../adventure/bot/bot.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<{ id: number; move?: Move; error?: string }>) => {
      const w = waiting.get(e.data.id)
      if (!w) return
      waiting.delete(e.data.id)
      if (e.data.move) w.resolve(e.data.move)
      else w.reject(new Error(e.data.error ?? 'The bot could not move.'))
    }
  }
  return worker
}

/** Ask the bot (in a worker) for its move. */
export function askBot(
  state: AsState,
  level: BotLevel,
  seed: number,
  thinkMs?: number,
): Promise<Move> {
  const id = ++seq
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject })
    getWorker().postMessage({ id, state, level, seed, thinkMs })
  })
}
