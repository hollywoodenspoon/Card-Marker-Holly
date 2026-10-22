import type { LabSliceResult } from '@/adventure/lab/play'
import type { LabExec, LabResult, LabStage } from '@/adventure/lab/run'
import { downloadBlob } from '@/ui/actions/download'
import { runJobs } from '../workerPool'

const labWorker = () =>
  new Worker(new URL('../../adventure/lab/lab.worker.ts', import.meta.url), { type: 'module' })

/** Plays the lab's slices on `threads` workers, with games done per stage. */
export function labExec(
  threads: number,
  onGames: (stage: LabStage, games: number) => void,
  stopped: () => boolean,
): LabExec {
  const done: Record<LabStage, number> = { cards: 0, constructed: 0, premades: 0 }
  return async (stage, slices) => {
    const base = done[stage]
    const size = slices[0]?.games.length ?? 0
    const total = slices.reduce((a, s) => a + s.games.length, 0)
    const out = await runJobs<LabSliceResult>(
      labWorker,
      slices,
      'result',
      (n) => onGames(stage, base + Math.min(total, n * size)),
      stopped,
      threads,
    )
    done[stage] = base + total
    return out
  }
}

/** Milliseconds per game on one thread (measured on a laptop-class core), for the estimate. */
export const MS_PER_GAME = { quick: 25, normal: 320 } as const

export const SIM_FILE = 'hearthside-sim'

/** Save a run as a `.hssim.json` file (the results and the Markdown report). */
export function exportSim(result: LabResult, report: string) {
  const day = new Date(result.startedAt).toISOString().slice(0, 10)
  const name = `${result.packName} balance ${day}`.replace(/[^\w\- ]+/g, '').trim()
  downloadBlob(
    new Blob(
      [JSON.stringify({ format: SIM_FILE, version: 1, exportedAt: Date.now(), result, report })],
      { type: 'application/json' },
    ),
    `${name || 'balance'}.hssim.json`,
  )
}
