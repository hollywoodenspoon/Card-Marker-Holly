/// <reference lib="webworker" />
/** Runs imagetracerjs off the main thread: image pixels in, SVG text out. */
import ImageTracer from 'imagetracerjs'

interface Job {
  id: number
  width: number
  height: number
  data: Uint8ClampedArray
  options: Record<string, unknown>
}

self.onmessage = (e: MessageEvent<Job>) => {
  const { id, width, height, data, options } = e.data
  try {
    const svg = ImageTracer.imagedataToSVG({ width, height, data }, options)
    self.postMessage({ id, svg })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
