import { create } from 'zustand'
import { applyAction, type TableAction } from '@/playtest/actions'
import { randomSeed } from '@/playtest/rng'
import type { GameSetup } from '@/playtest/setup'
import { createTable, type DeckCards, type TableState } from '@/playtest/state'

const HISTORY = 500

export type Selection = { kind: 'piece'; id: string } | { kind: 'token'; id: string } | null

interface PlaytestStore {
  /** The project the game belongs to (a game ends when another project opens). */
  projectId: string | null
  setup: GameSetup | null
  state: TableState | null
  past: TableState[]
  future: TableState[]
  selected: Selection
  /** Tap-to-place: the next tap on the table moves the selection there. */
  placing: boolean
  /** Who the table is shown to (null: everyone, when you play every seat). */
  viewer: number | null
  start: (projectId: string, setup: GameSetup, decks: (DeckCards | null)[]) => void
  act: (a: TableAction) => void
  undo: () => void
  redo: () => void
  end: () => void
  select: (s: Selection, placing?: boolean) => void
  setViewer: (v: number | null) => void
}

/**
 * The open game. It is not saved: it stays while the project is open (closing
 * the Playtest view and coming back continues it) and ends with New game.
 */
export const usePlaytest = create<PlaytestStore>((set, get) => ({
  projectId: null,
  setup: null,
  state: null,
  past: [],
  future: [],
  selected: null,
  placing: false,
  viewer: null,
  start: (projectId, setup, decks) =>
    set({
      projectId,
      setup,
      state: createTable(setup, decks, randomSeed()),
      past: [],
      future: [],
      selected: null,
      placing: false,
    }),
  act: (a) => {
    const { setup, state, past } = get()
    if (!setup || !state) return
    const next = applyAction(setup, state, a)
    if (next === state) return
    set({ state: next, past: [...past, state].slice(-HISTORY), future: [], placing: false })
  },
  undo: () => {
    const { state, past, future } = get()
    if (!state || !past.length) return
    set({
      state: past.at(-1)!,
      past: past.slice(0, -1),
      future: [state, ...future],
      placing: false,
    })
  },
  redo: () => {
    const { state, past, future } = get()
    if (!state || !future.length) return
    set({ state: future[0], past: [...past, state], future: future.slice(1), placing: false })
  },
  end: () =>
    set({
      projectId: null,
      setup: null,
      state: null,
      past: [],
      future: [],
      selected: null,
      placing: false,
    }),
  select: (selected, placing = false) => set({ selected, placing }),
  setViewer: (viewer) => set({ viewer }),
}))
