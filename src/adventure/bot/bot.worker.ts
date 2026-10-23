/// <reference lib="webworker" />
/** Runs the bot off the main thread, so the table stays responsive while Hard thinks. */
import type { AsState } from '../state'
import { botMove, type BotLevel } from '.'

interface Job {
  id: number
  state: AsState
  level: BotLevel
  seed: number
  playouts?: number
  /** Hard: think for about this long (with a generous iteration ceiling). */
  thinkMs?: number
}

/** Hard's iteration ceiling when thinking against the clock. */
const CEILING = 50_000

self.onmessage = (e: MessageEvent<Job>) => {
  const { id, state, level, seed, playouts, thinkMs } = e.data
  try {
    const opts = thinkMs ? { playouts, thinkMs, iterations: CEILING } : { playouts }
    self.postMessage({ id, move: botMove(state, level, seed, opts) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
