/**
 * The open game, with its own undo history (the 3D map editor keeps its own, in
 * engineStore.ts). `commit(recipe)` is the one way to change the game, so scenes,
 * decks, variables and events are all undoable. What's on screen (the open scene or
 * deck, the selected area or object) is editor state, not undoable.
 */
import { produce } from 'immer'
import { create } from 'zustand'
import { History } from '@/core/history/history'
import { newGame, type GameDoc } from '../model/game'

const history = new History<GameDoc>()

/** The left rail's sections. */
export type GamePanel = 'game' | 'scenes' | 'decks' | 'cards' | 'images' | 'variables' | 'map'

/** What the centre shows. */
export type GameView = { kind: 'scene'; id: string } | { kind: 'deck'; id: string } | { kind: 'none' }

export type GameSelection = { kind: 'area' | 'object'; id: string } | { kind: 'scene' } | null

export interface GameState {
  game: GameDoc
  canUndo: boolean
  canRedo: boolean
  panel: GamePanel
  view: GameView
  selection: GameSelection
  commit: (recipe: (g: GameDoc) => void, coalesceKey?: string) => void
  endStroke: () => void
  setGame: (g: GameDoc) => void
  setPanel: (p: GamePanel) => void
  setView: (v: GameView) => void
  select: (s: GameSelection) => void
  undo: () => void
  redo: () => void
}

export const useGame = create<GameState>((set, get) => ({
  game: newGame(),
  canUndo: false,
  canRedo: false,
  panel: 'scenes',
  view: { kind: 'none' },
  selection: null,
  commit: (recipe, coalesceKey) => {
    const before = get().game
    const next = produce(before, recipe)
    if (next === before) return
    history.record(before, coalesceKey)
    set({ game: next, canUndo: history.canUndo, canRedo: history.canRedo })
  },
  endStroke: () => history.breakCoalescing(),
  setGame: (game) => {
    history.clear()
    set({ game, canUndo: false, canRedo: false, selection: null, view: { kind: 'none' } })
  },
  setPanel: (panel) => set({ panel }),
  setView: (view) => set({ view, selection: null }),
  select: (selection) => set({ selection }),
  undo: () => {
    const prev = history.undo(get().game)
    if (prev) set({ game: prev, canUndo: history.canUndo, canRedo: history.canRedo })
  },
  redo: () => {
    const next = history.redo(get().game)
    if (next) set({ game: next, canUndo: history.canUndo, canRedo: history.canRedo })
  },
}))

/** The scene the centre shows, if it shows one. */
export function openScene(s: GameState) {
  const v = s.view
  return v.kind === 'scene' ? (s.game.scenes.find((x) => x.id === v.id) ?? null) : null
}
