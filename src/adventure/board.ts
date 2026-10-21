/**
 * The Adventure Scuffle field: 2 rows × 3 columns per player. Slot index =
 * row * 3 + column. Row 0 is the Front Line, row 1 the Rear Guard; column 1
 * is the Center, columns 0 and 2 the Flank.
 */
export const ROWS = 2
export const COLS = 3
export const SLOTS = ROWS * COLS

export const rowOf = (slot: number) => Math.floor(slot / COLS)
export const colOf = (slot: number) => slot % COLS
export const isCenter = (slot: number) => colOf(slot) === 1
export const isFlank = (slot: number) => !isCenter(slot)
export const isFrontLine = (slot: number) => rowOf(slot) === 0
export const isRearGuard = (slot: number) => rowOf(slot) === 1

/** Orthogonal neighbours (diagonals don't count). */
export function neighbours(slot: number): number[] {
  const r = rowOf(slot)
  const c = colOf(slot)
  const out: number[] = []
  if (r > 0) out.push(slot - COLS)
  if (r < ROWS - 1) out.push(slot + COLS)
  if (c > 0) out.push(slot - 1)
  if (c < COLS - 1) out.push(slot + 1)
  return out.sort((a, b) => a - b)
}

export const adjacent = (a: number, b: number) => neighbours(a).includes(b)

/** The position directly across on the opponent's field: same row, opposite column. */
export const mirrored = (slot: number) => rowOf(slot) * COLS + (COLS - 1 - colOf(slot))

const ROW_NAMES = ['Front Line', 'Rear Guard']
const COL_NAMES = ['Left Flank', 'Center', 'Right Flank']
export const slotName = (slot: number) => `${ROW_NAMES[rowOf(slot)]} ${COL_NAMES[colOf(slot)]}`

/** Every pair of adjacent slots, each once (a < b). */
export const ADJACENT_PAIRS: [number, number][] = Array.from({ length: SLOTS }, (_, a) =>
  neighbours(a)
    .filter((b) => b > a)
    .map((b): [number, number] => [a, b]),
).flat()
