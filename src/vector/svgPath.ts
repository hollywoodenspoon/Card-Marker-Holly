/**
 * Parse SVG path data ("M10 10 C…") into editable subpaths. Handles every
 * command (M L H V C S Q T A Z, absolute and relative); quadratic curves and
 * arcs become cubic Béziers. Pure.
 */
import type { Anchor, Pt, SubPath } from './geometry'

function tokenize(d: string): (string | number)[] {
  const out: (string | number)[] = []
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d))) out.push(m[1] ?? Number(m[2]))
  return out
}

/** The 7 numbers of an arc command. (Flags must be separated, e.g. "0 1 0".) */
function arcArgs(tokens: (string | number)[], i: number): number[] {
  return tokens.slice(i, i + 7).map(Number)
}

/** Endpoint-parameterised arc → cubic segments [c1, c2, end][]. */
function arcToCubics(
  p0: Pt,
  rxIn: number,
  ryIn: number,
  angleDeg: number,
  largeArc: boolean,
  sweep: boolean,
  p: Pt,
): [Pt, Pt, Pt][] {
  if (!rxIn || !ryIn || (p0.x === p.x && p0.y === p.y)) return [[p0, p, p]]
  let rx = Math.abs(rxIn)
  let ry = Math.abs(ryIn)
  const phi = (angleDeg * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (p0.x - p.x) / 2
  const dy = (p0.y - p.y) / 2
  const x1 = cos * dx + sin * dy
  const y1 = -sin * dx + cos * dy
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (lam > 1) {
    rx *= Math.sqrt(lam)
    ry *= Math.sqrt(lam)
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1
  let co = Math.sqrt(Math.max(0, num / den))
  if (largeArc === sweep) co = -co
  const cx1 = (co * rx * y1) / ry
  const cy1 = (-co * ry * x1) / rx
  const cx = cos * cx1 - sin * cy1 + (p0.x + p.x) / 2
  const cy = sin * cx1 + cos * cy1 + (p0.y + p.y) / 2
  const ang = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
  if (!sweep && dt > 0) dt -= 2 * Math.PI
  if (sweep && dt < 0) dt += 2 * Math.PI
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2)))
  const step = dt / n
  const k = (4 / 3) * Math.tan(step / 4)
  const pt = (t: number) => {
    const x = rx * Math.cos(t)
    const y = ry * Math.sin(t)
    return { x: cos * x - sin * y + cx, y: sin * x + cos * y + cy }
  }
  const der = (t: number) => {
    const x = -rx * Math.sin(t)
    const y = ry * Math.cos(t)
    return { x: cos * x - sin * y, y: sin * x + cos * y }
  }
  const out: [Pt, Pt, Pt][] = []
  for (let s = 0; s < n; s++) {
    const a = t1 + s * step
    const b = a + step
    const pa = pt(a)
    const pb = s === n - 1 ? p : pt(b)
    const da = der(a)
    const db = der(b)
    out.push([
      { x: pa.x + k * da.x, y: pa.y + k * da.y },
      { x: pb.x - k * db.x, y: pb.y - k * db.y },
      pb,
    ])
  }
  return out
}

export function parsePathData(d: string): SubPath[] {
  const t = tokenize(d)
  const subs: SubPath[] = []
  let cur: SubPath | null = null
  let pos: Pt = { x: 0, y: 0 }
  let start: Pt = { x: 0, y: 0 }
  let lastCtrl: Pt | null = null // for S / T reflection
  let lastQuad: Pt | null = null
  let cmd = ''
  let i = 0
  const num = () => Number(t[i++])
  const last = () => cur!.anchors[cur!.anchors.length - 1]
  const begin = (p: Pt) => {
    cur = { anchors: [{ x: p.x, y: p.y }], closed: false }
    subs.push(cur)
    start = p
  }
  const ensure = () => {
    if (!cur) begin(pos)
  }
  const cubic = (c1: Pt, c2: Pt, p: Pt) => {
    ensure()
    const a = last()
    a.hout = { x: c1.x - a.x, y: c1.y - a.y }
    cur!.anchors.push({ x: p.x, y: p.y, hin: { x: c2.x - p.x, y: c2.y - p.y } })
    pos = p
  }
  const line = (p: Pt) => {
    ensure()
    cur!.anchors.push({ x: p.x, y: p.y })
    pos = p
  }

  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++] as string
    else if (!cmd) {
      i++
      continue
    }
    const rel = cmd === cmd.toLowerCase()
    const o = rel ? pos : { x: 0, y: 0 }
    const C = cmd.toUpperCase()
    let ctrl: Pt | null = null
    let quad: Pt | null = null
    switch (C) {
      case 'M': {
        const p = { x: o.x + num(), y: o.y + num() }
        begin(p)
        pos = p
        cmd = rel ? 'l' : 'L' // following pairs are line-tos
        break
      }
      case 'L':
        line({ x: o.x + num(), y: o.y + num() })
        break
      case 'H':
        line({ x: (rel ? pos.x : 0) + num(), y: pos.y })
        break
      case 'V':
        line({ x: pos.x, y: (rel ? pos.y : 0) + num() })
        break
      case 'C': {
        const c1 = { x: o.x + num(), y: o.y + num() }
        const c2 = { x: o.x + num(), y: o.y + num() }
        const p = { x: o.x + num(), y: o.y + num() }
        cubic(c1, c2, p)
        ctrl = c2
        break
      }
      case 'S': {
        const c1 = lastCtrl ? { x: 2 * pos.x - lastCtrl.x, y: 2 * pos.y - lastCtrl.y } : pos
        const c2 = { x: o.x + num(), y: o.y + num() }
        const p = { x: o.x + num(), y: o.y + num() }
        cubic(c1, c2, p)
        ctrl = c2
        break
      }
      case 'Q':
      case 'T': {
        const q: Pt =
          C === 'Q'
            ? { x: o.x + num(), y: o.y + num() }
            : lastQuad
              ? { x: 2 * pos.x - lastQuad.x, y: 2 * pos.y - lastQuad.y }
              : pos
        const p = { x: o.x + num(), y: o.y + num() }
        const p0 = pos
        cubic(
          { x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) },
          { x: p.x + (2 / 3) * (q.x - p.x), y: p.y + (2 / 3) * (q.y - p.y) },
          p,
        )
        quad = q
        break
      }
      case 'A': {
        const [rx, ry, rot, la, sw, x, y] = arcArgs(t, i)
        i += 7
        const p = { x: o.x + x, y: o.y + y }
        for (const [c1, c2, e] of arcToCubics(pos, rx, ry, rot, !!la, !!sw, p)) cubic(c1, c2, e)
        pos = p
        break
      }
      case 'Z': {
        if (cur) {
          const s: SubPath = cur
          const a0 = s.anchors[0]
          const z = s.anchors[s.anchors.length - 1]
          // A last anchor on top of the first one is the same point: merge them.
          if (s.anchors.length > 1 && Math.abs(z.x - a0.x) < 1e-6 && Math.abs(z.y - a0.y) < 1e-6) {
            if (z.hin) a0.hin = z.hin
            s.anchors.pop()
          }
          s.closed = true
        }
        cur = null
        pos = start
        break
      }
      default:
        i++
    }
    lastCtrl = ctrl
    lastQuad = quad
  }
  return subs.filter((s) => s.anchors.length > 0)
}

/** True for an anchor whose handles point in opposite directions (a smooth point). */
export function isSmooth(a: Anchor): boolean {
  if (!a.hin || !a.hout) return false
  const l1 = Math.hypot(a.hin.x, a.hin.y)
  const l2 = Math.hypot(a.hout.x, a.hout.y)
  if (l1 < 1e-6 || l2 < 1e-6) return false
  return (
    Math.abs((a.hin.x * a.hout.y - a.hin.y * a.hout.x) / (l1 * l2)) < 0.02 &&
    a.hin.x * a.hout.x + a.hin.y * a.hout.y < 0
  )
}
