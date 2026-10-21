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
}

self.onmessage = (e: MessageEvent<Job>) => {
  const { id, state, level, seed, playouts } = e.data
  try {
    self.postMessage({ id, move: botMove(state, level, seed, { playouts }) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
