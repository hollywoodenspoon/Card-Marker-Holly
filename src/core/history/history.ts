/**
 * Snapshot-based undo/redo. Snapshots are immutable (immer), so storing
 * them is cheap thanks to structural sharing.
 *
 * Consecutive commits with the same coalesce key inside `windowMs` merge
 * into one undo step (a drag gesture, typing into a field, a slider).
 */
export class History<T> {
  private past: T[] = []
  private future: T[] = []
  private lastKey: string | null = null
  private lastTime = 0

  constructor(
    private limit = 200,
    private windowMs = 1500,
  ) {}

  /** Record `before` as an undo point prior to a change. */
  record(before: T, coalesceKey?: string, now = Date.now()) {
    const merge =
      coalesceKey !== undefined &&
      coalesceKey === this.lastKey &&
      now - this.lastTime < this.windowMs
    this.lastKey = coalesceKey ?? null
    this.lastTime = now
    this.future = []
    if (merge) return
    this.past.push(before)
    if (this.past.length > this.limit) this.past.shift()
  }

  /** Stop the current coalescing run so the next change starts a new step. */
  breakCoalescing() {
    this.lastKey = null
  }

  undo(current: T): T | undefined {
    const prev = this.past.pop()
    if (prev === undefined) return undefined
    this.future.push(current)
    this.lastKey = null
    return prev
  }

  redo(current: T): T | undefined {
    const next = this.future.pop()
    if (next === undefined) return undefined
    this.past.push(current)
    this.lastKey = null
    return next
  }

  clear() {
    this.past = []
    this.future = []
    this.lastKey = null
  }

  get canUndo() {
    return this.past.length > 0
  }
  get canRedo() {
    return this.future.length > 0
  }
}
