import { create } from 'zustand'
import { actor, apply, createGame, type Move, type NewGame } from '@/adventure/engine'
import type { AsState } from '@/adventure/state'
import { toTable } from '@/adventure/table'
import { applyAction, type TableAction } from '@/playtest/actions'
import { randomSeed } from '@/playtest/rng'
import type { GameSetup } from '@/playtest/setup'
import { createTable, type DeckCards, type TableState } from '@/playtest/state'
import { movesFor, tapPiece } from './rulesPlay'

const HISTORY = 500

const NO_RULES = { rules: null, rulesPast: [], rulesFuture: [], picks: [] }

export type Selection = { kind: 'piece'; id: string } | { kind: 'token'; id: string } | null

interface PlaytestStore {
  /** The pack the game is played with. */
  packId: string | null
  setup: GameSetup | null
  state: TableState | null
  past: TableState[]
  future: TableState[]
  selected: Selection
  /** Tap-to-place: the next tap on the table moves the selection there. */
  placing: boolean
  /** Who the table is shown to (null: everyone, when you play every seat). */
  viewer: number | null
  /**
   * Adventure Scuffle with rules on: the rules state and its own undo history.
   * `state` is then drawn from it, and table actions become rule moves.
   */
  rules: AsState | null
  rulesPast: AsState[]
  rulesFuture: AsState[]
  /** Positions picked for a pair reveal so far. */
  picks: number[]
  start: (packId: string, setup: GameSetup, decks: (DeckCards | null)[]) => void
  /** Start a game with the rules on; `hotseat` hides each player's cards between turns. */
  startRules: (packId: string, setup: GameSetup, game: NewGame, hotseat: boolean) => void
  /** Continue a saved game. */
  resume: (
    packId: string,
    setup: GameSetup,
    state: TableState,
    past: TableState[],
    rules?: { state: AsState; past: AsState[]; viewer: number | null },
  ) => void
  act: (a: TableAction) => void
  /** Play rule moves as one undo step. */
  play: (moves: Move | Move[]) => void
  /** A tap on a piece under the rules; false when the rules don't use it. */
  tapRules: (pieceId: string) => boolean
  undo: () => void
  redo: () => void
  /** New game: clear the table (the pack stays open). */
  end: () => void
  /** Another pack was opened without a saved game. */
  clear: (packId: string) => void
  select: (s: Selection, placing?: boolean) => void
  setViewer: (v: number | null) => void
}

/** The open game (saved per pack by the Playtest app, so a reload continues it). */
export const usePlaytest = create<PlaytestStore>((set, get) => ({
  packId: null,
  setup: null,
  state: null,
  past: [],
  future: [],
  selected: null,
  placing: false,
  viewer: null,
  rules: null,
  rulesPast: [],
  rulesFuture: [],
  picks: [],
  start: (packId, setup, decks) =>
    set({
      packId,
      setup,
      state: createTable(setup, decks, randomSeed()),
      past: [],
      future: [],
      selected: null,
      placing: false,
      ...NO_RULES,
    }),
  startRules: (packId, setup, game, hotseat) => {
    const rules = createGame(game)
    set({
      packId,
      setup,
      state: toTable(setup, rules),
      past: [],
      future: [],
      selected: null,
      placing: false,
      rules,
      rulesPast: [],
      rulesFuture: [],
      picks: [],
      viewer: hotseat ? actor(rules) : null,
    })
  },
  resume: (packId, setup, state, past, rules) =>
    set({
      packId,
      setup,
      state: rules ? toTable(setup, rules.state) : state,
      past,
      future: [],
      selected: null,
      placing: false,
      ...(rules
        ? {
            rules: rules.state,
            rulesPast: rules.past,
            rulesFuture: [],
            picks: [],
            viewer: rules.viewer,
          }
        : NO_RULES),
    }),
  play: (moves) => {
    const { setup, rules, rulesPast } = get()
    if (!setup || !rules) return
    let next = rules
    for (const m of Array.isArray(moves) ? moves : [moves]) next = apply(next, m)
    if (next === rules) return
    set({
      rules: next,
      state: toTable(setup, next),
      rulesPast: [...rulesPast, rules].slice(-HISTORY),
      rulesFuture: [],
      picks: [],
      selected: null,
      placing: false,
    })
  },
  tapRules: (pieceId) => {
    const { rules, picks, play, select } = get()
    if (!rules) return false
    const r = tapPiece(rules, picks, pieceId)
    if (!r) return false
    if (r.kind === 'moves') play(r.moves)
    else if (r.kind === 'pick') set({ picks: r.picks, selected: null })
    else select({ kind: 'piece', id: pieceId }, true)
    return true
  },
  act: (a) => {
    const { setup, state, past, rules } = get()
    if (!setup || !state) return
    if (rules) {
      const moves = movesFor(rules, a)
      if (moves) get().play(moves)
      else set({ placing: false })
      return
    }
    const next = applyAction(setup, state, a)
    if (next === state) return
    set({ state: next, past: [...past, state].slice(-HISTORY), future: [], placing: false })
  },
  undo: () => {
    const { setup, rules, rulesPast, rulesFuture } = get()
    if (setup && rules) {
      if (!rulesPast.length) return
      const prev = rulesPast.at(-1)!
      return set({
        rules: prev,
        state: toTable(setup, prev),
        rulesPast: rulesPast.slice(0, -1),
        rulesFuture: [rules, ...rulesFuture],
        picks: [],
        placing: false,
      })
    }
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
    const { setup, rules, rulesPast, rulesFuture } = get()
    if (setup && rules) {
      if (!rulesFuture.length) return
      const next = rulesFuture[0]
      return set({
        rules: next,
        state: toTable(setup, next),
        rulesPast: [...rulesPast, rules],
        rulesFuture: rulesFuture.slice(1),
        picks: [],
        placing: false,
      })
    }
    const { state, past, future } = get()
    if (!state || !future.length) return
    set({ state: future[0], past: [...past, state], future: future.slice(1), placing: false })
  },
  clear: (packId) =>
    set({
      packId,
      setup: null,
      state: null,
      past: [],
      future: [],
      selected: null,
      placing: false,
      ...NO_RULES,
    }),
  end: () =>
    set({
      setup: null,
      state: null,
      past: [],
      future: [],
      selected: null,
      placing: false,
      ...NO_RULES,
    }),
  select: (selected, placing = false) => set({ selected, placing }),
  setViewer: (viewer) => set({ viewer }),
}))
