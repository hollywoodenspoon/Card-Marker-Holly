/** Vector Maker state: the document with its own undo history, selection, tool and view. */
import { produce, type Draft } from 'immer'
import { create } from 'zustand'
import { newDoc, type VectorDoc, type VStyle } from './model'

export type Tool =
  'select' | 'direct' | 'pen' | 'addAnchor' | 'deleteAnchor' | 'convert' | 'shape' | 'hand'

export interface AnchorRef {
  pathId: string
  sub: number
  index: number
}

interface VectorState {
  doc: VectorDoc
  /** Asset being edited (Save can replace it). */
  assetId: string | null
  /** Selected paths. */
  selection: string[]
  /** Selected anchors (direct selection). */
  anchors: AnchorRef[]
  activeLayerId: string
  tool: Tool
  shapeId: string
  /** Path being drawn with the pen. */
  penPathId: string | null
  /** What a pen click would do at the pointer (shown as a hint). */
  penHint: string | null
  /** Touch stand-in for Alt: drag a handle on its own. */
  breakHandles: boolean
  snap: boolean
  pixelGrid: boolean
  /** Style for new shapes. */
  shapeStyle: VStyle
  view: { zoom: number; panX: number; panY: number }
  past: VectorDoc[]
  future: VectorDoc[]
  dirty: boolean
}

const MAX_HISTORY = 200
let lastKey: string | undefined

export const useVector = create<VectorState>(() => {
  const doc = newDoc()
  return {
    doc,
    assetId: null,
    selection: [],
    anchors: [],
    activeLayerId: doc.layers[0].id,
    tool: 'select',
    shapeId: 'rect',
    penPathId: null,
    penHint: null,
    breakHandles: false,
    snap: true,
    pixelGrid: false,
    shapeStyle: {
      fill: '#0e9494',
      stroke: null,
      strokeWidth: 2,
      opacity: 1,
      lineJoin: 'round',
      lineCap: 'round',
    },
    view: { zoom: 1, panX: 0, panY: 0 },
    past: [],
    future: [],
    dirty: false,
  }
})

/** Change the document (one undo step; calls with the same `coalesce` key merge). */
export function vcommit(recipe: (d: Draft<VectorDoc>) => void, coalesce?: string) {
  const s = useVector.getState()
  const next = produce(s.doc, recipe)
  if (next === s.doc) return
  const merge = coalesce !== undefined && coalesce === lastKey
  lastKey = coalesce
  useVector.setState({
    doc: next,
    past: merge ? s.past : [...s.past.slice(-MAX_HISTORY + 1), s.doc],
    future: [],
    dirty: true,
  })
}

/** Ends a coalescing run (e.g. at pointer up), so the next change is its own step. */
export const endVGesture = () => (lastKey = undefined)

function clean(doc: VectorDoc) {
  // Selection may point at things undo removed.
  const ids = new Set(doc.layers.flatMap((l) => l.items.map((i) => i.id)))
  const s = useVector.getState()
  return {
    selection: s.selection.filter((id) => ids.has(id)),
    anchors: s.anchors.filter((a) => ids.has(a.pathId)),
    activeLayerId: doc.layers.some((l) => l.id === s.activeLayerId)
      ? s.activeLayerId
      : doc.layers[doc.layers.length - 1].id,
    penPathId: null,
  }
}

export function vundo() {
  const s = useVector.getState()
  const prev = s.past[s.past.length - 1]
  if (!prev) return
  lastKey = undefined
  useVector.setState({
    doc: prev,
    past: s.past.slice(0, -1),
    future: [s.doc, ...s.future],
    ...clean(prev),
  })
}

export function vredo() {
  const s = useVector.getState()
  const next = s.future[0]
  if (!next) return
  lastKey = undefined
  useVector.setState({
    doc: next,
    past: [...s.past, s.doc],
    future: s.future.slice(1),
    ...clean(next),
  })
}

/** Start editing a document (a new one, or one opened from an asset or file). */
export function loadVectorDoc(doc: VectorDoc, assetId: string | null = null) {
  lastKey = undefined
  useVector.setState({
    doc,
    assetId,
    selection: [],
    anchors: [],
    activeLayerId: doc.layers[doc.layers.length - 1].id,
    tool: 'select',
    penPathId: null,
    past: [],
    future: [],
    dirty: false,
  })
}

export const setTool = (tool: Tool) =>
  useVector.setState((s) => ({ tool, penPathId: tool === 'pen' ? s.penPathId : null }))

export const selectPaths = (selection: string[]) => useVector.setState({ selection, anchors: [] })
