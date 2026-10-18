import type { Bounds } from '../model/tree'

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'

/** Offsets that align each box to `ref` (the card, or the selection's bounds). */
export function alignDeltas(
  boxes: Bounds[],
  ref: Bounds,
  mode: AlignMode,
): { dx: number; dy: number }[] {
  return boxes.map((b) => {
    switch (mode) {
      case 'left':
        return { dx: ref.xMm - b.xMm, dy: 0 }
      case 'hcenter':
        return { dx: ref.xMm + ref.wMm / 2 - (b.xMm + b.wMm / 2), dy: 0 }
      case 'right':
        return { dx: ref.xMm + ref.wMm - (b.xMm + b.wMm), dy: 0 }
      case 'top':
        return { dx: 0, dy: ref.yMm - b.yMm }
      case 'vcenter':
        return { dx: 0, dy: ref.yMm + ref.hMm / 2 - (b.yMm + b.hMm / 2) }
      case 'bottom':
        return { dx: 0, dy: ref.yMm + ref.hMm - (b.yMm + b.hMm) }
    }
  })
}

/** Even gaps between 3+ boxes along an axis; the outermost boxes stay put. */
export function distributeDeltas(boxes: Bounds[], axis: 'x' | 'y'): { dx: number; dy: number }[] {
  const pos = (b: Bounds) => (axis === 'x' ? b.xMm : b.yMm)
  const size = (b: Bounds) => (axis === 'x' ? b.wMm : b.hMm)
  const order = boxes.map((b, i) => ({ b, i })).sort((a, c) => pos(a.b) - pos(c.b))
  const out = boxes.map(() => ({ dx: 0, dy: 0 }))
  if (boxes.length < 3) return out
  const first = order[0].b
  const last = order[order.length - 1].b
  const span = pos(last) + size(last) - pos(first)
  const total = order.reduce((s, o) => s + size(o.b), 0)
  const gap = (span - total) / (order.length - 1)
  let cursor = pos(first)
  for (const { b, i } of order) {
    const d = cursor - pos(b)
    out[i] = axis === 'x' ? { dx: d, dy: 0 } : { dx: 0, dy: d }
    cursor += size(b) + gap
  }
  return out
}
