import type { Move } from '@/adventure/engine'
import type { RushJob, RushResult } from '@/adventure/sim/rush'
import type { Seat } from '@/adventure/state'

/** A finished Rush game as the worker sends it (the final state left out). */
export type RushGame = Omit<RushResult, 'match'> & {
  match: {
    moves: Move[]
    by: Seat[]
    first: Seat
    problem?: string
    winner: Seat | null
    points: [number, number]
    rounds: number
  }
}

/** Workers for a batch: all but one core, at most 4. */
const poolSize = () => Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1))

/**
 * Play `games` Rush games on a pool of workers. `onGame` gets each one as it
 * ends (not in order); `onDone` once all have. Returns a stop function.
 */
export function runRush(
  job: RushJob,
  games: number,
  onGame: (g: RushGame) => void,
  onDone: () => void,
): () => void {
  const n = Math.min(poolSize(), games)
  let left = n
  const workers = Array.from({ length: n }, (_, part) => {
    const w = new Worker(new URL('../../adventure/sim/rush.worker.ts', import.meta.url), {
      type: 'module',
    })
    w.onmessage = (e: MessageEvent<{ type: 'game'; result: RushGame } | { type: 'done' }>) => {
      if (e.data.type === 'game') onGame(e.data.result)
      else {
        w.terminate()
        if (--left === 0) onDone()
      }
    }
    w.postMessage({ job, games, part, of: n })
    return w
  })
  return () => workers.forEach((w) => w.terminate())
}
