/**
 * Image → vector tracing, the pure parts: tracer settings, and turning the
 * tracer's SVG into a layer that fits the artboard. The tracing itself runs
 * in a worker (traceWorker.ts).
 */
import { boxToBox, transform } from '../geometry'
import { newLayer, type VectorDoc, type VLayer } from '../model'
import { fromSvg } from '../svg'

export interface TraceSettings {
  /** Number of colours (2–16). */
  colors: number
  /** 1 (loose, fewer points) … 10 (follows every bump). */
  detail: number
  /** Blur before tracing, 0–5 (smoother edges, fewer specks). */
  smooth: number
  /** Drop shapes smaller than this many pixels (specks). */
  minArea: number
  /** Leave out the shapes in the background colour (the image's corner colour). */
  ignoreBackground: boolean
}

export const DEFAULT_TRACE: TraceSettings = {
  colors: 6,
  detail: 6,
  smooth: 1,
  minArea: 8,
  ignoreBackground: true,
}

/** imagetracerjs options for these settings. */
export function tracerOptions(s: TraceSettings): Record<string, unknown> {
  const tol = Math.max(0.05, (11 - Math.min(10, Math.max(1, s.detail))) / 5)
  return {
    numberofcolors: Math.round(Math.min(16, Math.max(2, s.colors))),
    ltres: tol,
    qtres: tol,
    pathomit: Math.max(0, Math.round(s.minArea)),
    blurradius: Math.round(Math.min(5, Math.max(0, s.smooth))),
    blurdelta: 20,
    colorsampling: 2,
    colorquantcycles: 3,
    // A hairline in the fill colour hides the seams between neighbouring shapes.
    strokewidth: 1,
    roundcoords: 2,
    viewbox: true,
  }
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

/** The colour of the image's top-left pixel (its likely background), or null if transparent. */
export function cornerColor(img: { width: number; data: ArrayLike<number> }): string | null {
  const d = img.data
  return d[3] < 128 ? null : hex(d[0], d[1], d[2])
}

const near = (a: string, b: string) => {
  const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 40
}

/**
 * The traced SVG as one layer, scaled to fit the artboard (centred, aspect
 * kept). Mostly transparent shapes, and the background colour when asked, are
 * left out.
 */
export function tracedLayer(
  svg: string,
  doc: Pick<VectorDoc, 'width' | 'height'>,
  name: string,
  background: string | null,
): VLayer {
  const traced = fromSvg(svg)
  const layer = newLayer(name)
  layer.items = traced.layers
    .flatMap((l) => l.items)
    // Mostly see-through shapes are the soft edges of a transparent picture: leave them out.
    .filter((i) => i.style.opacity >= 0.5 && i.style.fill)
    .filter((i) => !background || !near(i.style.fill!, background))
  layer.items.forEach((i, k) => (i.name = `Shape ${k + 1}`))
  // Fit the source picture's frame (not just the shapes) into the artboard.
  const k = Math.min(doc.width / traced.width, doc.height / traced.height)
  const to = {
    x: (doc.width - traced.width * k) / 2,
    y: (doc.height - traced.height * k) / 2,
    w: traced.width * k,
    h: traced.height * k,
  }
  const m = boxToBox({ x: 0, y: 0, w: traced.width, h: traced.height }, to)
  for (const it of layer.items) {
    it.subpaths = transform(it.subpaths, m)
    it.style.strokeWidth = Math.max(0.5, it.style.strokeWidth * k)
  }
  return layer
}
