/** The Vector Maker's document: an artboard with layers of paths. Units are px. Pure. */
import { nanoid } from 'nanoid'
import type { SubPath } from './geometry'

export interface VStyle {
  /** Fill colour (#rrggbb) or null for none. */
  fill: string | null
  stroke: string | null
  strokeWidth: number
  opacity: number
  lineJoin?: 'miter' | 'round' | 'bevel'
  lineCap?: 'butt' | 'round' | 'square'
}

/** A preset shape still editable by its settings (dropped on the first point edit). */
export interface ShapeInfo {
  id: string
  params: Record<string, number>
  box: { x: number; y: number; w: number; h: number }
}

export interface VPath {
  id: string
  name: string
  subpaths: SubPath[]
  style: VStyle
  hidden?: boolean
  locked?: boolean
  shape?: ShapeInfo
}

export interface VLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  /** Bottom first (drawing order). */
  items: VPath[]
}

export interface VectorDoc {
  version: 1
  width: number
  height: number
  /** Bottom first (drawing order). */
  layers: VLayer[]
}

export const newId = () => nanoid(10)

export const DEFAULT_STYLE: VStyle = {
  fill: '#0e9494',
  stroke: null,
  strokeWidth: 2,
  opacity: 1,
  lineJoin: 'round',
  lineCap: 'round',
}

/** Style for paths drawn with the pen: an outline, like Illustrator's default stroke. */
export const PEN_STYLE: VStyle = { ...DEFAULT_STYLE, fill: null, stroke: '#1f1f24', strokeWidth: 3 }

export const newLayer = (name: string): VLayer => ({
  id: newId(),
  name,
  visible: true,
  locked: false,
  opacity: 1,
  items: [],
})

export function newDoc(width = 512, height = 512): VectorDoc {
  return { version: 1, width, height, layers: [newLayer('Layer 1')] }
}

export const newPath = (
  name: string,
  subpaths: SubPath[],
  style: VStyle = DEFAULT_STYLE,
): VPath => ({
  id: newId(),
  name,
  subpaths,
  style: { ...style },
})

/** Every path with its layer (bottom first). */
export function allItems(doc: VectorDoc): { layer: VLayer; item: VPath; index: number }[] {
  return doc.layers.flatMap((layer) => layer.items.map((item, index) => ({ layer, item, index })))
}

export function findItem(doc: VectorDoc, id: string) {
  for (const layer of doc.layers) {
    const index = layer.items.findIndex((i) => i.id === id)
    if (index >= 0) return { layer, item: layer.items[index], index }
  }
  return undefined
}

/** A document read from storage, or null when it isn't one. */
export function parseDoc(json: string | undefined): VectorDoc | null {
  if (!json) return null
  try {
    const d = JSON.parse(json) as VectorDoc
    return d?.version === 1 && Array.isArray(d.layers) ? d : null
  } catch {
    return null
  }
}
