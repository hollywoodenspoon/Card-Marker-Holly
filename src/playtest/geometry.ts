import { slotRect, type GameSetup, type PlacedZone, type Size, type TableLayout } from './setup'
import type { TableState } from './state'

/** Where a piece is drawn on the table, in table mm (x, y: its centre). */
export interface PieceBox {
  id: string
  zone: string
  cx: number
  cy: number
  w: number
  h: number
  rotation: number
  /** Drawing order inside its zone. */
  z: number
}

const PAD = 1.5
/** Offset between pieces sharing one grid slot. */
const SLOT_STEP = 3

/** Bounding box of a w × h rectangle turned by `deg`. */
function turnedBox(w: number, h: number, deg: number) {
  const r = (deg * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  return { w: w * c + h * s, h: w * s + h * c }
}

/** Scale (≤ 1) that fits a turned piece into a box. */
const fit = (p: Size, deg: number, box: Size) => {
  const t = turnedBox(p.w, p.h, deg)
  return Math.min(1, (box.w - PAD * 2) / t.w, (box.h - PAD * 2) / t.h)
}

/**
 * Every visible piece's box. Grids centre a piece in its slot (shrunk when it
 * would not fit turned); rows fan out, overlapping when full; stacks draw
 * only their top piece; areas place pieces where they were dropped.
 */
export function pieceBoxes(
  setup: GameSetup,
  layout: TableLayout,
  state: TableState,
  sizeOf: (pieceId: string) => Size,
): PieceBox[] {
  const rot = (id: string) =>
    setup.cardStates.find((s) => s.id === state.pieces[id]?.state)?.rotation ?? 0
  const out: PieceBox[] = []
  for (const pz of layout.zones) {
    const zc = state.zones[pz.key]
    if (!zc) continue
    const z = pz.zone
    if (zc.slots) {
      zc.slots.forEach((ids, slot) => {
        const r = slotRect(z, slot, pz.turned)
        ids.forEach((id, i) => {
          const size = sizeOf(id)
          const deg = rot(id)
          const k = fit(size, deg, r)
          out.push({
            id,
            zone: pz.key,
            cx: pz.x + r.x + r.w / 2 + i * SLOT_STEP,
            cy: pz.y + r.y + r.h / 2 + i * SLOT_STEP,
            w: size.w * k,
            h: size.h * k,
            rotation: deg,
            z: i,
          })
        })
      })
    } else if (z.kind === 'stack') {
      const top = zc.items!.at(-1)
      if (top) {
        const size = sizeOf(top)
        const deg = rot(top)
        const k = fit(size, deg, pz)
        out.push({
          id: top,
          zone: pz.key,
          cx: pz.x + pz.w / 2,
          cy: pz.y + pz.h / 2,
          w: size.w * k,
          h: size.h * k,
          rotation: deg,
          z: 0,
        })
      }
    } else if (z.kind === 'row') {
      const ids = zc.items!
      if (!ids.length) continue
      const sizes = ids.map(sizeOf)
      const k = Math.min(1, ...sizes.map((s) => (pz.h - PAD * 2) / s.h))
      const cardW = Math.max(...sizes.map((s) => s.w)) * k
      const room = pz.w - PAD * 2 - cardW
      const step = ids.length > 1 ? Math.min(cardW + PAD, room / (ids.length - 1)) : 0
      ids.forEach((id, i) => {
        const s = sizes[i]
        out.push({
          id,
          zone: pz.key,
          cx: pz.x + PAD + cardW / 2 + i * Math.max(0, step),
          cy: pz.y + pz.h / 2,
          w: s.w * k,
          h: s.h * k,
          rotation: 0,
          z: i,
        })
      })
    } else {
      zc.items!.forEach((id, i) => {
        const size = sizeOf(id)
        const p = zc.pos?.[id] ?? { x: pz.w / 2, y: pz.h / 2 }
        out.push({
          id,
          zone: pz.key,
          cx: pz.x + p.x,
          cy: pz.y + p.y,
          w: size.w,
          h: size.h,
          rotation: rot(id),
          z: i,
        })
      })
    }
  }
  return out
}

/** Where a drop at table point (x, y) lands in a zone: its slot, row position, or area spot. */
export function targetAt(pz: PlacedZone, x: number, y: number, boxes: PieceBox[]) {
  const z = pz.zone
  const lx = x - pz.x
  const ly = y - pz.y
  if (z.kind === 'grid') {
    const rows = z.rows ?? 1
    const cols = z.cols ?? 1
    let c = Math.min(cols - 1, Math.max(0, Math.floor((lx / pz.w) * cols)))
    let r = Math.min(rows - 1, Math.max(0, Math.floor((ly / pz.h) * rows)))
    if (pz.turned) {
      c = cols - 1 - c
      r = rows - 1 - r
    }
    return { zone: pz.key, slot: r * cols + c }
  }
  if (z.kind === 'row') {
    const inRow = boxes.filter((b) => b.zone === pz.key).sort((a, b) => a.z - b.z)
    const index = inRow.filter((b) => b.cx < x).length
    return { zone: pz.key, index }
  }
  if (z.kind === 'area')
    return {
      zone: pz.key,
      x: Math.min(pz.w, Math.max(0, lx)),
      y: Math.min(pz.h, Math.max(0, ly)),
    }
  return { zone: pz.key }
}
