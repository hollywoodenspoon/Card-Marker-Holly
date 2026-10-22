/// <reference lib="webworker" />
/** Plays a tournament's bot-against-bot matches off the main thread. */
import { playSeries, type SeriesJob } from './series'

self.onmessage = (e: MessageEvent<SeriesJob & { id: number }>) => {
  const { id, ...job } = e.data
  try {
    self.postMessage({ id, games: playSeries(job) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
