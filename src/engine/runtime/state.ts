/**
 * The running game's state, in one store the player UI reads. Split from
 * runtime.ts so the flow (runtime.ts) and the player's things (world.ts) share it.
 */
import { create } from 'zustand'
import type { Collection, Inventory } from '../economy/collection'
import type { Pulled } from '../economy/booster'
import type { GameDoc, ImageRef } from '../model/game'

/** Who's talking in the dialogue box. */
export interface Speaker {
  character: string | null
  name: string
  color: string
  expression: string
}

export interface LogLine {
  name: string | null
  color: string | null
  text: string
}

export interface OpenedPack {
  booster: string
  cards: Pulled[]
}

export interface ActivityOption {
  kind: 'activity' | 'event'
  id: string
  name: string
  description: string
  image: ImageRef | null
  locked: boolean
  lockText: string
}

/** A screen over the scene that the running steps wait for. */
export type Screen =
  | { kind: 'shop'; id: string; pack: OpenedPack | null }
  | { kind: 'booster'; pack: OpenedPack }
  | { kind: 'deck'; deckId: string }
  | { kind: 'activity'; options: ActivityOption[]; forced: boolean }
  | { kind: 'calendar' }

export interface RuntimeState {
  running: boolean
  game: GameDoc | null
  sceneId: string | null
  /** Scenes to go Back to, most recent last. */
  trail: string[]
  vars: Record<string, boolean | number>
  /** Things shown or hidden by Cause and Effect (otherwise as placed). */
  hidden: Record<string, boolean>
  /** Decks as they are while playing (built on the fly or copied from the game). */
  decks: Record<string, Record<string, number>>
  message: string | null
  /** Set when the message is a character speaking. */
  speaker: Speaker | null
  choice: { prompt: string; options: string[] } | null
  /** Everything said so far, oldest first (the last 200 lines). */
  log: LogLine[]
  inventory: Inventory
  collection: Collection
  /** Weeks since the game started (0 = the first week). */
  week: number
  /** Seeds the calendar's random events for this playthrough. */
  calSeed: number
  /** Decks the player edits from their own cards (selling keeps their copies). */
  ownedDecks: string[]
  screen: Screen | null
  /** The game is over: the ending's text. */
  ended: string | null
  /** A longer job the player waits for ("Building a deck… 40%"). */
  status: string | null
  /** True while Play's table runs a card game this game started. */
  away: boolean
  /** Steps are running (clicks wait until they finish). */
  busy: boolean
}

export const idle: RuntimeState = {
  running: false,
  game: null,
  sceneId: null,
  trail: [],
  vars: {},
  hidden: {},
  decks: {},
  message: null,
  speaker: null,
  choice: null,
  log: [],
  inventory: {},
  collection: {},
  week: 0,
  calSeed: 1,
  ownedDecks: [],
  screen: null,
  ended: null,
  status: null,
  away: false,
  busy: false,
}

export const useRuntime = create<RuntimeState>(() => ({ ...idle }))

export const set = (s: Partial<RuntimeState>) => useRuntime.setState(s)
export const get = () => useRuntime.getState()

export const LOG_MAX = 200
export function pushLog(line: LogLine) {
  const log = get().log
  set({ log: [...log.slice(Math.max(0, log.length - LOG_MAX + 1)), line] })
}

// ---------- screens the steps wait for ----------

let closeWith: ((v: number) => void) | null = null

/** Shows a screen and waits until the player closes it (resolves with a pick, if any). */
export function showScreen(screen: Screen): Promise<number> {
  closeScreen(-1)
  return new Promise((resolve) => {
    closeWith = resolve
    set({ screen })
  })
}

/** Closes the open screen; `pick` answers an activity screen. */
export function closeScreen(pick = -1) {
  const c = closeWith
  closeWith = null
  if (get().screen) set({ screen: null })
  c?.(pick)
}
