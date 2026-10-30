/**
 * Path geometry for the Vector Maker: cubic Bézier paths made of anchors with
 * handles (relative to their anchor, like Illustrator and paper.js). Pure.
 */

export interface Pt {
  x: number
  y: number
}

export interface Anchor {
  x: number
  y: number
  /** Incoming handle, relative to the anchor. Missing = no handle. */
  hin?: Pt
  /** Outgoing handle, relative to the anchor. */
  hout?: Pt
}

export interface SubPath {
  anchors: Anchor[]
  closed: boolean
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Affine matrix [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f. */
export type Matrix = [number, number, number, number, number, number]

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

const add = (a: Pt, b?: Pt): Pt => (b ? { x: a.x + b.x, y: a.y + b.y } : { x: a.x, y: a.y })
const lerp = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

/** The cubic control points of each segment: [p0, p1, p2, p3], plus the anchor indexes. */
export function segments(sub: SubPath): { pts: [Pt, Pt, Pt, Pt]; i: number; j: number }[] {
  const n = sub.anchors.length
  const out: { pts: [Pt, Pt, Pt, Pt]; i: number; j: number }[] = []
  const count = sub.closed ? n : n - 1
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % n
    const a = sub.anchors[i]
    const b = sub.anchors[j]
    out.push({ pts: [a, add(a, a.hout), add(b, b.hin), b], i, j })
  }
  return out
}

export function bezierPoint([p0, p1, p2, p3]: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  }
}

/** de Casteljau split of a cubic at t. */
export function splitCubic(
  [p0, p1, p2, p3]: [Pt, Pt, Pt, Pt],
  t: number,
): [[Pt, Pt, Pt, Pt], [Pt, Pt, Pt, Pt]] {
  const a = lerp(p0, p1, t)
  const b = lerp(p1, p2, t)
  const c = lerp(p2, p3, t)
  const d = lerp(a, b, t)
  const e = lerp(b, c, t)
  const m = lerp(d, e, t)
  return [
    [p0, a, d, m],
    [m, e, c, p3],
  ]
}

const fmt = (v: number) => String(Math.round(v * 1000) / 1000)

const isZero = (h?: Pt) => !h || (Math.abs(h.x) < 1e-9 && Math.abs(h.y) < 1e-9)

/** SVG path data for subpaths (straight segments as L, curves as C). */
export function pathData(subs: SubPath[]): string {
  const parts: string[] = []
  for (const sub of subs) {
    if (!sub.anchors.length) continue
    const a0 = sub.anchors[0]
    parts.push(`M${fmt(a0.x)} ${fmt(a0.y)}`)
    for (const { pts, i, j } of segments(sub)) {
      const a = sub.anchors[i]
      const b = sub.anchors[j]
      const straight = isZero(a.hout) && isZero(b.hin)
      // A straight closing segment is drawn by Z itself.
      if (straight && sub.closed && j === 0) continue
      if (straight) parts.push(`L${fmt(b.x)} ${fmt(b.y)}`)
      else
        parts.push(
          `C${fmt(pts[1].x)} ${fmt(pts[1].y)} ${fmt(pts[2].x)} ${fmt(pts[2].y)} ${fmt(b.x)} ${fmt(b.y)}`,
        )
    }
    if (sub.closed) parts.push('Z')
  }
  return parts.join(' ')
}

/** Tight-enough bounds (each curve is sampled). */
export function bounds(subs: SubPath[]): Box {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  const take = (p: Pt) => {
    x0 = Math.min(x0, p.x)
    y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x)
    y1 = Math.max(y1, p.y)
  }
  for (const sub of subs) {
    sub.anchors.forEach(take)
    for (const { pts } of segments(sub)) for (let k = 1; k < 24; k++) take(bezierPoint(pts, k / 24))
  }
  if (x0 === Infinity) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export const applyMatrix = ([a, b, c, d, e, f]: Matrix, p: Pt): Pt => ({
  x: a * p.x + c * p.y + e,
  y: b * p.x + d * p.y + f,
})
const applyLinear = ([a, b, c, d]: Matrix, p: Pt): Pt => ({
  x: a * p.x + c * p.y,
  y: b * p.x + d * p.y,
})

export function multiply(m: Matrix, n: Matrix): Matrix {
  // m after n
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

export const translateM = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy]

/** Maps box `from` onto box `to` (scale + move). */
export function boxToBox(from: Box, to: Box): Matrix {
  const sx = from.w ? to.w / from.w : 1
  const sy = from.h ? to.h / from.h : 1
  return [sx, 0, 0, sy, to.x - from.x * sx, to.y - from.y * sy]
}

export function transform(subs: SubPath[], m: Matrix): SubPath[] {
  return subs.map((s) => ({
    closed: s.closed,
    anchors: s.anchors.map((a) => {
      const p = applyMatrix(m, a)
      return {
        x: p.x,
        y: p.y,
        ...(a.hin && { hin: applyLinear(m, a.hin) }),
        ...(a.hout && { hout: applyLinear(m, a.hout) }),
      }
    }),
  }))
}

export interface PathHit {
  sub: number
  seg: number
  t: number
  point: Pt
  dist: number
}

/** Closest point on the outline (sampled, then refined). */
export function nearestOnPath(subs: SubPath[], p: Pt): PathHit | null {
  let best: PathHit | null = null
  subs.forEach((sub, si) => {
    segments(sub).forEach(({ pts }, seg) => {
      const N = 32
      let bt = 0
      let bd = Infinity
      for (let k = 0; k <= N; k++) {
        const d = dist(bezierPoint(pts, k / N), p)
        if (d < bd) {
          bd = d
          bt = k / N
        }
      }
      // refine around the best sample
      let lo = Math.max(0, bt - 1 / N)
      let hi = Math.min(1, bt + 1 / N)
      for (let it = 0; it < 20; it++) {
        const m1 = lo + (hi - lo) / 3
        const m2 = hi - (hi - lo) / 3
        if (dist(bezierPoint(pts, m1), p) < dist(bezierPoint(pts, m2), p)) hi = m2
        else lo = m1
      }
      const t = (lo + hi) / 2
      const q = bezierPoint(pts, t)
      const d = dist(q, p)
      if (!best || d < best.dist) best = { sub: si, seg, t, point: q, dist: d }
    })
  })
  return best
}

/** Insert an anchor on segment `seg` at `t`, keeping the curve's shape. */
export function insertAnchor(sub: SubPath, seg: number, t: number): SubPath {
  const s = segments(sub)[seg]
  if (!s) return sub
  const [left, right] = splitCubic(s.pts, t)
  const anchors = sub.anchors.map((a) => ({ ...a }))
  const a = anchors[s.i]
  const b = anchors[s.j]
  const m = left[3]
  a.hout = { x: left[1].x - a.x, y: left[1].y - a.y }
  b.hin = { x: right[2].x - b.x, y: right[2].y - b.y }
  const mid: Anchor = {
    x: m.x,
    y: m.y,
    hin: { x: left[2].x - m.x, y: left[2].y - m.y },
    hout: { x: right[1].x - m.x, y: right[1].y - m.y },
  }
  anchors.splice(s.i + 1, 0, mid)
  return { ...sub, anchors }
}

/** Remove an anchor; null when too few anchors would be left. */
export function removeAnchor(sub: SubPath, i: number): SubPath | null {
  const anchors = sub.anchors.filter((_, k) => k !== i)
  if (anchors.length < 2) return null
  return { ...sub, closed: sub.closed && anchors.length > 2, anchors }
}

export function reverseSub(sub: SubPath): SubPath {
  return {
    closed: sub.closed,
    anchors: [...sub.anchors].reverse().map((a) => ({
      x: a.x,
      y: a.y,
      ...(a.hout && { hin: a.hout }),
      ...(a.hin && { hout: a.hin }),
    })),
  }
}

/** Smooth closed curve through points (Catmull-Rom converted to Béziers). */
export function smoothClosed(points: Pt[], tension = 1): SubPath {
  const n = points.length
  return {
    closed: true,
    anchors: points.map((p, i) => {
      const prev = points[(i - 1 + n) % n]
      const next = points[(i + 1) % n]
      const tx = ((next.x - prev.x) / 6) * tension
      const ty = ((next.y - prev.y) / 6) * tension
      return { x: p.x, y: p.y, hin: { x: -tx, y: -ty }, hout: { x: tx, y: ty } }
    }),
  }
}

/** Snap an offset to 45° steps (Shift while drawing). */
export function snap45(from: Pt, to: Pt): Pt {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
  return { x: from.x + Math.cos(ang) * len, y: from.y + Math.sin(ang) * len }
}

/** Area of the filled shape (even-odd), by flattening curves. Used in tests. */
export function area(subs: SubPath[]): number {
  let total = 0
  for (const sub of subs) {
    if (!sub.closed) continue
    const poly: Pt[] = []
    for (const { pts } of segments(sub))
      for (let k = 0; k < 32; k++) poly.push(bezierPoint(pts, k / 32))
    let a = 0
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const q = poly[(i + 1) % poly.length]
      a += p.x * q.y - q.x * p.y
    }
    total += a / 2
  }
  return Math.abs(total)
}

/**
 * Whether a point is inside the shape (even-odd, like an SVG path filled with
 * fill-rule="evenodd"; open subpaths count as closed). Curves are sampled, so it's
 * exact to well under a pixel at the sizes the app draws. Used for click areas.
 */
export function pointInPaths(subs: SubPath[], p: Pt, samples = 16): boolean {
  let inside = false
  for (const sub of subs) {
    if (sub.anchors.length < 2) continue
    const poly: Pt[] = []
    for (const seg of segments({ ...sub, closed: true }))
      for (let k = 0; k < samples; k++) poly.push(bezierPoint(seg.pts, k / samples))
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]
      const b = poly[j]
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
        inside = !inside
    }
  }
  return inside
}
