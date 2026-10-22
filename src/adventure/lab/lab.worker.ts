/// <reference lib="webworker" />
/** The Balance lab's games, off the main thread: one slice of a stage per job. */
import { playSlice, type LabSlice } from './play'

self.onmessage = (e: MessageEvent<LabSlice & { id: number }>) => {
  const { id, ...slice } = e.data
  try {
    self.postMessage({ id, result: playSlice(slice) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
