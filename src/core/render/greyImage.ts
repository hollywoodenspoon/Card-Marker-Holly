/** Greyscale copies of loaded pictures for the canvas (cached per picture). */
const cache = new WeakMap<CanvasImageSource, HTMLCanvasElement>()

/** Longest side for vector pictures (SVGs have no fixed pixel size). */
const VECTOR_PX = 512

export function greyCopy(img: CanvasImageSource, vector = false): HTMLCanvasElement {
  const hit = cache.get(img)
  if (hit) return hit
  const size = img as {
    naturalWidth?: number
    naturalHeight?: number
    width?: unknown
    height?: unknown
  }
  let w = size.naturalWidth || (typeof size.width === 'number' ? size.width : 0)
  let h = size.naturalHeight || (typeof size.height === 'number' ? size.height : 0)
  if (vector || !w || !h) {
    const k = VECTOR_PX / Math.max(w || 1, h || 1)
    w = Math.max(1, Math.round((w || 1) * k))
    h = Math.max(1, Math.round((h || 1) * k))
  }
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  try {
    const data = ctx.getImageData(0, 0, w, h)
    const p = data.data
    for (let i = 0; i < p.length; i += 4) {
      const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
      p[i] = p[i + 1] = p[i + 2] = y
    }
    ctx.putImageData(data, 0, 0)
  } catch {
    /* tainted canvas: leave the colour copy */
  }
  cache.set(img, c)
  return c
}
