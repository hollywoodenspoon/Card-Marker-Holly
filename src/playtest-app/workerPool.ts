import { desktop } from '@/platform/desktop'

/** The computer's threads, less one for the app itself. */
export const maxThreads = () => Math.max(1, (navigator.hardwareConcurrency || 2) - 1)

/** Workers to use for a batch: all but one core, at most 4 (the Balance lab may ask for more). */
export const poolSize = () => Math.min(4, maxThreads())

/**
 * Run jobs on a pool of workers (made by `make`, so Vite can bundle each
 * worker where it's named), a few at a time. Each reply is `{id, error?}` plus
 * the result under `key`. Results come back in job order.
 */
export async function runJobs<R>(
  make: () => Worker,
  jobs: object[],
  key: string,
  onDone?: (done: number) => void,
  stopped?: () => boolean,
  threads = poolSize(),
): Promise<R[]> {
  const n = Math.max(1, Math.min(threads, maxThreads(), jobs.length))
  const out: R[] = new Array(jobs.length)
  let nextJob = 0
  let done = 0
  const workers = Array.from({ length: n }, make)
  // The desktop app keeps the computer awake while a batch runs.
  void desktop()?.keepAwake?.(true)
  try {
    await Promise.all(
      workers.map(
        (w) =>
          new Promise<void>((resolve, reject) => {
            // A worker that crashes (fails to load, runs out of memory, sends something
            // that can't be read) ends the run with an error instead of hanging it.
            w.onerror = (e) => {
              e.preventDefault()
              reject(new Error(e.message || 'A worker stopped unexpectedly.'))
            }
            w.onmessageerror = () =>
              reject(new Error('A worker sent a result that could not be read.'))
            const give = () => {
              if (stopped?.() || nextJob >= jobs.length) return resolve()
              const i = nextJob++
              w.onmessage = (e: MessageEvent<{ error?: string } & Record<string, unknown>>) => {
                if (e.data.error) return reject(new Error(e.data.error))
                out[i] = e.data[key] as R
                onDone?.(++done)
                give()
              }
              w.postMessage({ ...jobs[i], id: i })
            }
            give()
          }),
      ),
    )
  } finally {
    workers.forEach((w) => w.terminate())
    void desktop()?.keepAwake?.(false)
  }
  return out
}
