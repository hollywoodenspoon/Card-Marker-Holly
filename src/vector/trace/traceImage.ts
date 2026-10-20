/** Load a picture's pixels (scaled down for speed) and trace them in a worker. */

/** Longest side used for tracing: enough detail, still quick. */
export const TRACE_MAX_PX = 1024
/** Small pictures are enlarged (smoothly) first, which gives smoother outlines. */
export const TRACE_MIN_PX = 512

export async function loadPixels(blob: Blob): Promise<ImageData> {
  const bmp = await createImageBitmap(blob)
  const longest = Math.max(bmp.width, bmp.height)
  const k = Math.min(TRACE_MAX_PX / longest, Math.max(1, TRACE_MIN_PX / longest))
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return ctx.getImageData(0, 0, w, h)
}

let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, { resolve: (svg: string) => void; reject: (e: Error) => void }>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./traceWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; svg?: string; error?: string }>) => {
      const w = waiting.get(e.data.id)
      if (!w) return
      waiting.delete(e.data.id)
      if (e.data.svg !== undefined) w.resolve(e.data.svg)
      else w.reject(new Error(e.data.error ?? 'Tracing failed.'))
    }
  }
  return worker
}

/** SVG text of the traced picture. Older requests still running are dropped when a newer one arrives. */
export function traceImage(img: ImageData, options: Record<string, unknown>): Promise<string> {
  const id = ++seq
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject })
    // Copy the pixels so the caller's ImageData stays usable.
    const data = new Uint8ClampedArray(img.data)
    getWorker().postMessage({ id, width: img.width, height: img.height, data, options }, [
      data.buffer,
    ])
  })
}
