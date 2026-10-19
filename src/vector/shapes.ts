/**
 * Preset shapes, each built as ordinary editable subpaths inside a box.
 * Most are drawn in a 100 × 100 box as path data and scaled; the ones with
 * settings (sides, points, teeth, corner radius…) are generated. Pure.
 */
import { boxToBox, smoothClosed, transform, type Box, type Pt, type SubPath } from './geometry'
import { parsePathData } from './svgPath'

export interface ShapeParam {
  key: string
  label: string
  min: number
  max: number
  step: number
  value: number
}

export interface ShapeDef {
  id: string
  label: string
  group: 'Basic' | 'Symbols' | 'Arrows'
  params?: ShapeParam[]
  /** Outline only (lines and arcs): drawn with a stroke instead of a fill. */
  open?: boolean
  build: (box: Box, p: Record<string, number>) => SubPath[]
}

const KAPPA = 0.5522847498

const unit = (d: string) => (box: Box) =>
  transform(parsePathData(d), boxToBox({ x: 0, y: 0, w: 100, h: 100 }, box))

export function ellipse(cx: number, cy: number, rx: number, ry: number): SubPath {
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  return {
    closed: true,
    anchors: [
      { x: cx, y: cy - ry, hin: { x: -kx, y: 0 }, hout: { x: kx, y: 0 } },
      { x: cx + rx, y: cy, hin: { x: 0, y: -ky }, hout: { x: 0, y: ky } },
      { x: cx, y: cy + ry, hin: { x: kx, y: 0 }, hout: { x: -kx, y: 0 } },
      { x: cx - rx, y: cy, hin: { x: 0, y: ky }, hout: { x: 0, y: -ky } },
    ],
  }
}

const poly = (pts: Pt[]): SubPath => ({ closed: true, anchors: pts.map((p) => ({ ...p })) })

export function roundedRect(b: Box, r: number): SubPath {
  const rr = Math.max(0, Math.min(r, b.w / 2, b.h / 2))
  if (!rr)
    return poly([
      b,
      { x: b.x + b.w, y: b.y },
      { x: b.x + b.w, y: b.y + b.h },
      { x: b.x, y: b.y + b.h },
    ])
  const k = rr * KAPPA
  const { x, y, w, h } = b
  return {
    closed: true,
    anchors: [
      { x: x + rr, y, hin: { x: -k, y: 0 } },
      { x: x + w - rr, y, hout: { x: k, y: 0 } },
      { x: x + w, y: y + rr, hin: { x: 0, y: -k } },
      { x: x + w, y: y + h - rr, hout: { x: 0, y: k } },
      { x: x + w - rr, y: y + h, hin: { x: k, y: 0 } },
      { x: x + rr, y: y + h, hout: { x: -k, y: 0 } },
      { x, y: y + h - rr, hin: { x: 0, y: k } },
      { x, y: y + rr, hout: { x: 0, y: -k } },
    ],
  }
}

/** Points around an ellipse inscribed in the box, starting at the top. */
function around(b: Box, n: number, radius: (i: number) => number, offset = 0): Pt[] {
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + offset + (i * 2 * Math.PI) / n
    const r = radius(i)
    return { x: cx + (Math.cos(a) * b.w * r) / 2, y: cy + (Math.sin(a) * b.h * r) / 2 }
  })
}

const inset = (b: Box, f: number): Box => ({
  x: b.x + (b.w * f) / 2,
  y: b.y + (b.h * f) / 2,
  w: b.w * (1 - f),
  h: b.h * (1 - f),
})

export const SHAPES: ShapeDef[] = [
  // ---------- basic ----------
  { id: 'rect', label: 'Rectangle', group: 'Basic', build: (b) => [roundedRect(b, 0)] },
  {
    id: 'rounded',
    label: 'Rounded rectangle',
    group: 'Basic',
    params: [{ key: 'radius', label: 'Corner radius %', min: 0, max: 50, step: 1, value: 15 }],
    build: (b, p) => [roundedRect(b, (Math.min(b.w, b.h) * p.radius) / 100)],
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    group: 'Basic',
    build: (b) => [ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2)],
  },
  { id: 'triangle', label: 'Triangle', group: 'Basic', build: unit('M50 0 L100 100 L0 100 Z') },
  {
    id: 'polygon',
    label: 'Polygon',
    group: 'Basic',
    params: [{ key: 'sides', label: 'Sides', min: 3, max: 12, step: 1, value: 5 }],
    build: (b, p) => [poly(around(b, Math.round(p.sides), () => 1))],
  },
  {
    id: 'star',
    label: 'Star',
    group: 'Basic',
    params: [
      { key: 'points', label: 'Points', min: 3, max: 20, step: 1, value: 5 },
      { key: 'inner', label: 'Inner radius %', min: 10, max: 95, step: 1, value: 45 },
    ],
    build: (b, p) => [
      poly(around(b, Math.round(p.points) * 2, (i) => (i % 2 ? p.inner / 100 : 1))),
    ],
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    group: 'Basic',
    build: (b) => [poly(around(b, 6, () => 1, Math.PI / 6))],
  },
  {
    id: 'octagon',
    label: 'Octagon',
    group: 'Basic',
    build: (b) => [poly(around(b, 8, () => 1, Math.PI / 8))],
  },
  { id: 'diamond', label: 'Diamond', group: 'Basic', build: unit('M50 0 L100 50 L50 100 L0 50 Z') },
  { id: 'line', label: 'Line', group: 'Basic', open: true, build: unit('M0 50 L100 50') },
  {
    id: 'arc',
    label: 'Arc',
    group: 'Basic',
    open: true,
    build: unit('M0 100 C0 44.8 44.8 0 100 0'),
  },
  {
    id: 'frame',
    label: 'Frame',
    group: 'Basic',
    params: [
      { key: 'thickness', label: 'Thickness %', min: 2, max: 45, step: 1, value: 12 },
      { key: 'radius', label: 'Corner radius %', min: 0, max: 50, step: 1, value: 10 },
    ],
    build: (b, p) => {
      const t = (Math.min(b.w, b.h) * p.thickness) / 100
      const r = (Math.min(b.w, b.h) * p.radius) / 100
      const inner = {
        x: b.x + t,
        y: b.y + t,
        w: Math.max(1, b.w - 2 * t),
        h: Math.max(1, b.h - 2 * t),
      }
      return [roundedRect(b, r), roundedRect(inner, Math.max(0, r - t))]
    },
  },
  {
    id: 'ring',
    label: 'Ring',
    group: 'Basic',
    params: [{ key: 'thickness', label: 'Thickness %', min: 2, max: 48, step: 1, value: 20 }],
    build: (b, p) => {
      const i = inset(b, (2 * p.thickness) / 100)
      return [
        ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2),
        ellipse(i.x + i.w / 2, i.y + i.h / 2, i.w / 2, i.h / 2),
      ]
    },
  },
  // ---------- symbols ----------
  {
    id: 'heart',
    label: 'Heart',
    group: 'Symbols',
    build: unit(
      'M50 95 C50 95 2 64 2 32 C2 15 15 3 30 3 C40 3 47 9 50 17 C53 9 60 3 70 3 C85 3 98 15 98 32 C98 64 50 95 50 95 Z',
    ),
  },
  { id: 'gem', label: 'Gem', group: 'Symbols', build: unit('M22 5 L78 5 L100 35 L50 98 L0 35 Z') },
  {
    id: 'shield',
    label: 'Shield',
    group: 'Symbols',
    build: unit('M50 0 L96 14 C96 56 80 82 50 100 C20 82 4 56 4 14 Z'),
  },
  {
    id: 'cross',
    label: 'Cross',
    group: 'Symbols',
    build: unit('M35 0 H65 V35 H100 V65 H65 V100 H35 V65 H0 V35 H35 Z'),
  },
  {
    id: 'moon',
    label: 'Crescent moon',
    group: 'Symbols',
    build: unit(
      'M62 2 C30 6 6 26 6 52 C6 79 29 98 58 98 C76 98 90 90 98 78 C88 83 78 85 68 84 C44 82 28 64 28 44 C28 25 42 9 62 2 Z',
    ),
  },
  {
    id: 'lightning',
    label: 'Lightning bolt',
    group: 'Symbols',
    build: unit('M62 0 L14 58 H46 L36 100 L86 38 H54 Z'),
  },
  {
    id: 'droplet',
    label: 'Droplet',
    group: 'Symbols',
    build: unit(
      'M50 0 C50 0 14 44 14 65 C14 85 30 100 50 100 C70 100 86 85 86 65 C86 44 50 0 50 0 Z',
    ),
  },
  {
    id: 'flame',
    label: 'Flame',
    group: 'Symbols',
    build: unit(
      'M50 0 C58 24 86 36 86 66 C86 86 70 100 50 100 C30 100 14 86 14 66 C14 50 24 40 30 30 C32 44 39 50 45 52 C41 34 44 16 50 0 Z',
    ),
  },
  {
    id: 'sword',
    label: 'Sword',
    group: 'Symbols',
    build: unit(
      'M50 0 L56 10 V62 H70 V68 H56 V80 H58 V94 L54 100 H46 L42 94 V80 H44 V68 H30 V62 H44 V10 Z',
    ),
  },
  {
    id: 'crown',
    label: 'Crown',
    group: 'Symbols',
    build: unit('M6 82 L0 24 L28 48 L50 8 L72 48 L100 24 L94 82 Z M6 88 H94 V100 H6 Z'),
  },
  {
    id: 'gear',
    label: 'Gear',
    group: 'Symbols',
    params: [
      { key: 'teeth', label: 'Teeth', min: 4, max: 24, step: 1, value: 8 },
      { key: 'hole', label: 'Hole %', min: 0, max: 70, step: 1, value: 30 },
    ],
    build: (b, p) => {
      const n = Math.round(p.teeth)
      // 4 points per tooth: two on the outer radius, two on the root radius.
      const pts = around(b, n * 4, (i) => (i % 4 < 2 ? 1 : 0.78), -Math.PI / (n * 4))
      const out: SubPath[] = [poly(pts)]
      if (p.hole > 0) {
        const r = p.hole / 100
        out.push(ellipse(b.x + b.w / 2, b.y + b.h / 2, (b.w * r) / 2, (b.h * r) / 2))
      }
      return out
    },
  },
  {
    id: 'badge',
    label: 'Badge (seal)',
    group: 'Symbols',
    params: [{ key: 'bumps', label: 'Bumps', min: 6, max: 40, step: 1, value: 16 }],
    build: (b, p) => [
      smoothClosed(
        around(b, Math.round(p.bumps) * 2, (i) => (i % 2 ? 0.86 : 1)),
        0.9,
      ),
    ],
  },
  {
    id: 'bubble',
    label: 'Speech bubble',
    group: 'Symbols',
    build: unit(
      'M10 0 H90 C95.5 0 100 4.5 100 10 V65 C100 70.5 95.5 75 90 75 H42 L20 100 V75 H10 C4.5 75 0 70.5 0 65 V10 C0 4.5 4.5 0 10 0 Z',
    ),
  },
  {
    id: 'banner',
    label: 'Banner',
    group: 'Symbols',
    build: unit('M0 25 H100 L88 50 L100 75 H0 L12 50 Z'),
  },
  // ---------- arrows ----------
  {
    id: 'arrow',
    label: 'Arrow',
    group: 'Arrows',
    build: unit('M0 35 H60 V10 L100 50 L60 90 V65 H0 Z'),
  },
  {
    id: 'arrow-double',
    label: 'Double arrow',
    group: 'Arrows',
    build: unit('M0 50 L30 15 V35 H70 V15 L100 50 L70 85 V65 H30 V85 Z'),
  },
  {
    id: 'arrow-curved',
    label: 'Curved arrow',
    group: 'Arrows',
    build: unit('M8 95 C8 50 36 26 68 26 V6 L100 36 L68 66 V46 C48 46 30 62 30 95 Z'),
  },
  {
    id: 'chevron',
    label: 'Chevron',
    group: 'Arrows',
    build: unit('M0 0 H40 L100 50 L40 100 H0 L60 50 Z'),
  },
]

export const shapeById = (id: string) => SHAPES.find((s) => s.id === id)

export const defaultParams = (def: ShapeDef): Record<string, number> =>
  Object.fromEntries((def.params ?? []).map((p) => [p.key, p.value]))

export function buildShape(id: string, box: Box, params?: Record<string, number>): SubPath[] {
  const def = shapeById(id)
  if (!def) return []
  return def.build(box, { ...defaultParams(def), ...params })
}
