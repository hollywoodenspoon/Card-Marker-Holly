/**
 * A small seeded random number generator (mulberry32). The table keeps its
 * seed in its state, so every action is repeatable: undo, tests and (later)
 * an AI that simulates games all get the same results from the same state.
 */
export function next(seed: number): [value: number, seed: number] {
  const s = (seed + 0x6d2b79f5) | 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

/** A whole number from 0 to n − 1. */
export function nextInt(seed: number, n: number): [value: number, seed: number] {
  const [v, s] = next(seed)
  return [Math.floor(v * n), s]
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], seed: number): [items: T[], seed: number] {
  const out = items.slice()
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    let j: number
    ;[j, s] = nextInt(s, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, s]
}

/** A fresh seed for a new game. */
export const randomSeed = () => (Math.random() * 2 ** 32) >>> 0
