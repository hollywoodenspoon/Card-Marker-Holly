/** Card releases: which cards a release puts into circulation. */
import type { ReleaseDef } from '../model/league'
import { fieldText, type LCard } from './cards'
import type { Rng } from './rng'

/**
 * The cards of a release: the fixed ones, then `random` more drawn from cards not
 * yet out. Each draw is related to the one before (shares the `relatedBy` field)
 * with the release's chance, otherwise it is anything that fits.
 */
export function drawRelease(
  def: ReleaseDef,
  cards: LCard[],
  released: string[],
  rng: Rng,
): string[] {
  const out = new Set(released)
  const known = new Set(cards.map((c) => c.id))
  const picked: string[] = []
  for (const id of def.fixed)
    if (known.has(id) && !picked.includes(id)) picked.push(id)
  const taken = new Set([...out, ...picked])
  const only = def.onlyField && def.onlyText.trim().toLowerCase()
  const fits = (c: LCard) =>
    !taken.has(c.id) &&
    (!only || fieldText(c, def.onlyField).toLowerCase().includes(def.onlyText.trim().toLowerCase()))
  let last: LCard | null = null
  for (let i = 0; i < def.random; i++) {
    const open = cards.filter(fits)
    if (!open.length) break
    let from = open
    if (last && def.relatedBy && rng.chance(def.relatedChance)) {
      const v = fieldText(last, def.relatedBy)
      const rel = v ? open.filter((c) => fieldText(c, def.relatedBy) === v) : []
      if (rel.length) from = rel
    }
    const c = rng.pick(from)
    taken.add(c.id)
    picked.push(c.id)
    last = c
  }
  return picked
}
