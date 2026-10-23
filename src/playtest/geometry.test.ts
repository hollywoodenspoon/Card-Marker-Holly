import { describe, expect, it } from 'vitest'
import { createGame } from '@/adventure/engine'
import { basicCards, basicDecks } from '@/adventure/fixtures/basic'
import { toTable } from '@/adventure/table'
import { pieceBoxes, type PieceBox } from './geometry'
import { adventureScuffle, tableLayout, zoneKey } from './setup'

const card = { w: 63, h: 88 }
const setup = adventureScuffle(card)
const layout = tableLayout(setup)

/** The Support row's boxes with `n` cards in it. */
function supportBoxes(n: number): PieceBox[] {
  const s = createGame({ cards: basicCards(), decks: basicDecks(), names: ['A', 'B'], seed: 1 })
  const t = toTable(setup, s)
  const key = zoneKey('support', 0)
  t.zones[key] = { items: t.zones[key].items!.slice(0, n) }
  return pieceBoxes(setup, layout, t, () => card).filter((b) => b.zone === key)
}

const overlap = (a: PieceBox, b: PieceBox) =>
  Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 - 0.01 && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2 - 0.01

describe('row zones', () => {
  it('lay a full Support row out side by side, no card over another', () => {
    const boxes = supportBoxes(12)
    expect(boxes).toHaveLength(12)
    for (const a of boxes) for (const b of boxes) if (a !== b) expect(overlap(a, b)).toBe(false)
  })

  it('keep a short row in one line at full size', () => {
    const boxes = supportBoxes(6)
    expect(new Set(boxes.map((b) => b.cy)).size).toBe(1)
    expect(boxes.every((b) => b.h === card.h)).toBe(true)
  })
})
