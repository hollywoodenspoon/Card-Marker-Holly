/// <reference lib="webworker" />
/** The bot ladder's games, off the main thread: one slice per job. */
import { playLadderSlice, type LadderSlice } from './ladder'

self.onmessage = (e: MessageEvent<LadderSlice & { id: number }>) => {
  const { id, ...slice } = e.data
  try {
    self.postMessage({ id, result: playLadderSlice(slice) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
