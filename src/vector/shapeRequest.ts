/**
 * The Vector Maker as a shape editor for another tool: the Engine opens it to draw a
 * click area with the pen and shape tools, over the scene's picture. Done hands
 * the drawing back instead of saving an asset; nothing is kept as a draft.
 */
import { create } from 'zustand'
import type { VectorDoc } from './model'

export interface ShapeRequest {
  title: string
  doc: VectorDoc
  /** A picture shown under the drawing (not part of it). */
  reference?: { url: string; width: number; height: number }
  onDone: (doc: VectorDoc) => void
}

export const useShapeRequest = create<{ req: ShapeRequest | null }>(() => ({ req: null }))
export const openShapeEditor = (req: ShapeRequest) => useShapeRequest.setState({ req })
export const closeShapeEditor = () => useShapeRequest.setState({ req: null })
