/**
 * The player's things while a game runs: items as counts, and the card
 * collection with normal and foil copies counted apart. Pure functions that
 * return new objects (the runtime keeps them in its state).
 */

export type Inventory = Record<string, number>
export type Copies = { normal: number; foil: number }
export type Collection = Record<string, Copies>

/** Adds (or with a negative n, takes) items; never below 0. */
export function addItems(inv: Inventory, id: string, n: number): Inventory {
  const v = Math.max(0, (inv[id] ?? 0) + Math.trunc(n))
  const out = { ...inv }
  if (v > 0) out[id] = v
  else delete out[id]
  return out
}

export function addCards(col: Collection, id: string, foil: boolean, n: number): Collection {
  const cur = col[id] ?? { normal: 0, foil: 0 }
  const next = { ...cur }
  if (foil) next.foil = Math.max(0, cur.foil + Math.trunc(n))
  else next.normal = Math.max(0, cur.normal + Math.trunc(n))
  const out = { ...col }
  if (next.normal || next.foil) out[id] = next
  else delete out[id]
  return out
}

/** Copies owned: normal, foil or both. */
export function owned(col: Collection, id: string, which: 'normal' | 'foil' | 'any' = 'any') {
  const c = col[id]
  if (!c) return 0
  return which === 'normal' ? c.normal : which === 'foil' ? c.foil : c.normal + c.foil
}

/** A collection from a deck's counts (all normal copies). */
export function collectionOf(counts: Record<string, number>): Collection {
  let col: Collection = {}
  for (const [id, n] of Object.entries(counts)) col = addCards(col, id, false, n)
  return col
}

/** Copies not in use by any of these decks (the ones that can be sold). */
export function spare(col: Collection, decks: Record<string, number>[], id: string): number {
  const used = Math.max(0, ...decks.map((d) => d[id] ?? 0))
  return Math.max(0, owned(col, id) - used)
}

/** Takes copies, normal ones first, then foil. Returns how many foil copies went. */
export function takeCards(
  col: Collection,
  id: string,
  n: number,
): { col: Collection; foil: number } {
  const c = col[id] ?? { normal: 0, foil: 0 }
  const fromNormal = Math.min(c.normal, n)
  const fromFoil = Math.min(c.foil, n - fromNormal)
  let out = addCards(col, id, false, -fromNormal)
  out = addCards(out, id, true, -fromFoil)
  return { col: out, foil: fromFoil }
}

/** Keeps a deck within the copies owned. */
export function clampDeck(deck: Record<string, number>, col: Collection): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, n] of Object.entries(deck)) {
    const k = Math.min(n, owned(col, id))
    if (k > 0) out[id] = k
  }
  return out
}
