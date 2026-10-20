import { produce, type Draft } from 'immer'
import { create } from 'zustand'
import { History } from '../history/history'
import { flatten } from '../model/tree'
import type {
  Asset,
  Card,
  FontAsset,
  Id,
  Project,
  Side,
  StylePreset,
  Template,
} from '../model/types'
import { surfaceElements } from './selectors'

/** The undoable part of an open project. */
export interface DocState {
  project: Project
  templates: Record<Id, Template>
  cards: Record<Id, Card>
  /** Shared text styles; texts linked to one follow it live. */
  stylePresets: Record<Id, StylePreset>
}

/** Uploaded files. Not part of undo history. */
export interface LibraryState {
  assets: Record<Id, Asset>
  fonts: Record<Id, FontAsset>
}

export type EditMode = 'card' | 'template'

export interface ViewState {
  mode: EditMode
  cardId: Id | null
  side: Side
  /** Template being edited in template mode. */
  templateId: Id | null
  selection: Id[]
  /** Element whose text is being edited inline. */
  editingTextId: Id | null
  /** Image element in crop mode / image field in frame-adjust mode. */
  cropId: Id | null
  showOverlay: boolean
  snapping: boolean
  /** Taps add to / remove from the selection (touch screens have no Shift key). */
  multiSelect: boolean
}

export interface EditorState {
  doc: DocState | null
  library: LibraryState
  view: ViewState
  canUndo: boolean
  canRedo: boolean
}

export const initialView: ViewState = {
  mode: 'card',
  cardId: null,
  side: 'front',
  templateId: null,
  selection: [],
  editingTextId: null,
  cropId: null,
  showOverlay: true,
  snapping: true,
  multiSelect: false,
}

export const useEditor = create<EditorState>(() => ({
  doc: null,
  library: { assets: {}, fonts: {} },
  view: initialView,
  canUndo: false,
  canRedo: false,
}))

const history = new History<DocState>()

const syncHistoryFlags = () =>
  useEditor.setState({ canUndo: history.canUndo, canRedo: history.canRedo })

export function openDoc(doc: DocState, library: LibraryState, view: Partial<ViewState> = {}) {
  history.clear()
  useEditor.setState({ doc, library, view: { ...initialView, ...view } })
  syncHistoryFlags()
}

export function closeDoc() {
  history.clear()
  useEditor.setState({ doc: null, library: { assets: {}, fonts: {} }, view: initialView })
  syncHistoryFlags()
}

/**
 * Apply an undoable change to the document. Pass a `coalesce` key to merge
 * a burst of changes (a drag, typing) into one undo step.
 */
export function commit(recipe: (d: Draft<DocState>) => void, coalesce?: string) {
  const { doc } = useEditor.getState()
  if (!doc) return
  const next = produce(doc, recipe)
  if (next === doc) return
  history.record(doc, coalesce)
  useEditor.setState({ doc: next })
  syncHistoryFlags()
}

/** End the current coalescing run (e.g. at pointerup). */
export function endGesture() {
  history.breakCoalescing()
}

export function undo() {
  const { doc } = useEditor.getState()
  if (!doc) return
  const prev = history.undo(doc)
  if (prev) {
    useEditor.setState({ doc: prev })
    pruneSelection()
  }
  syncHistoryFlags()
}

export function redo() {
  const { doc } = useEditor.getState()
  if (!doc) return
  const next = history.redo(doc)
  if (next) {
    useEditor.setState({ doc: next })
    pruneSelection()
  }
  syncHistoryFlags()
}

export function updateLibrary(recipe: (d: Draft<LibraryState>) => void) {
  useEditor.setState((s) => ({ library: produce(s.library, recipe) }))
}

export function setView(patch: Partial<ViewState> | ((v: ViewState) => Partial<ViewState>)) {
  useEditor.setState((s) => ({
    view: { ...s.view, ...(typeof patch === 'function' ? patch(s.view) : patch) },
  }))
}

/** Remove selected ids that no longer exist after undo/redo. */
function pruneSelection() {
  const s = useEditor.getState()
  if (!s.view.selection.length) return
  const all = new Set(flatten(surfaceElements(s)).map((e) => e.id))
  const sel = s.view.selection.filter((id) => all.has(id))
  if (sel.length !== s.view.selection.length) setView({ selection: sel })
}
