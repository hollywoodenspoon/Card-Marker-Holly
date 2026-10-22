/** Workers to use for a batch: all but one core, at most 4. */
export const poolSize = () => Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1))

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
): Promise<R[]> {
  const n = Math.min(poolSize(), jobs.length)
  const out: R[] = new Array(jobs.length)
  let nextJob = 0
  let done = 0
  const workers = Array.from({ length: n }, make)
  try {
    await Promise.all(
      workers.map(
        (w) =>
          new Promise<void>((resolve, reject) => {
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
  }
  return out
}
