/** A small seeded random stream (mulberry32): the same seed gives the same numbers. */
export interface Rng {
  (): number
  int: (n: number) => number
  pick: <T>(list: readonly T[]) => T
  chance: (percent: number) => boolean
  shuffle: <T>(list: readonly T[]) => T[]
  /** The next seed to carry on from. */
  seed: () => number
}

export function makeRng(seed: number): Rng {
  let s = seed | 0
  const next = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const r = next as Rng
  r.int = (n) => Math.floor(next() * Math.max(1, n))
  r.pick = (list) => list[Math.floor(next() * list.length)]
  r.chance = (p) => next() * 100 < p
  r.shuffle = (list) => {
    const a = [...list]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  r.seed = () => Math.floor(next() * 2 ** 31)
  return r
}

/** One weighted pick: weights ≤ 0 never win. Null when none can. */
export function weighted<T>(rng: Rng, items: readonly T[], weight: (t: T) => number): T | null {
  const total = items.reduce((n, t) => n + Math.max(0, weight(t)), 0)
  if (total <= 0) return null
  let r = rng() * total
  for (const t of items) {
    r -= Math.max(0, weight(t))
    if (r < 0) return t
  }
  return items.at(-1) ?? null
}
