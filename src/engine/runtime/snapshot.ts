/**
 * A save: what a running game holds that the game file doesn't. Loading puts it
 * back and starts the saved scene again (its "scene starts" steps run), so a save
 * is always "just arrived in this scene".
 */
import type { RuntimeState } from './state'

export interface Snapshot {
  v: 1
  sceneId: string | null
  trail: string[]
  vars: RuntimeState['vars']
  hidden: RuntimeState['hidden']
  decks: RuntimeState['decks']
  inventory: RuntimeState['inventory']
  collection: RuntimeState['collection']
  week: number
  calSeed: number
  /** The random numbers' seed. */
  seed: number
  log: RuntimeState['log']
  ownedDecks: string[]
}

export function takeSnapshot(s: RuntimeState, seed: number): Snapshot {
  return structuredClone({
    v: 1 as const,
    sceneId: s.sceneId,
    trail: s.trail,
    vars: s.vars,
    hidden: s.hidden,
    decks: s.decks,
    inventory: s.inventory,
    collection: s.collection,
    week: s.week,
    calSeed: s.calSeed,
    seed,
    log: s.log,
    ownedDecks: s.ownedDecks,
  })
}

/** The state a snapshot puts back (anything missing from an older save is left empty). */
export function fromSnapshot(snap: Partial<Snapshot>): Partial<RuntimeState> {
  const obj = <T>(v: T | undefined, d: T): T => (v && typeof v === 'object' ? v : d)
  return {
    sceneId: typeof snap.sceneId === 'string' ? snap.sceneId : null,
    trail: Array.isArray(snap.trail) ? snap.trail : [],
    vars: obj(snap.vars, {}),
    hidden: obj(snap.hidden, {}),
    decks: obj(snap.decks, {}),
    inventory: obj(snap.inventory, {}),
    collection: obj(snap.collection, {}),
    week: Number(snap.week) || 0,
    calSeed: Number(snap.calSeed) || 1,
    log: Array.isArray(snap.log) ? snap.log : [],
    ownedDecks: Array.isArray(snap.ownedDecks) ? snap.ownedDecks : [],
  }
}
