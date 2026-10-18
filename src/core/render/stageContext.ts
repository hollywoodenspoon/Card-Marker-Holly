import type Konva from 'konva'
import { createContext, useContext } from 'react'
import type { AssetResolver } from './renderTypes'

export interface StageInteraction {
  /** Is this element's layout editable (draggable/transformable)? */
  isEditable(id: string): boolean
  /** Is this element selectable at all? (false when edit-locked) */
  isSelectable(id: string): boolean
  onElementPointerDown(e: Konva.KonvaEventObject<PointerEvent>, id: string): void
  onElementDblClick(id: string): void
  dragBoundFunc(id: string): ((pos: Konva.Vector2d) => Konva.Vector2d) | undefined
  onDragStart(id: string): void
  onDragEnd(id: string): void
  assets: AssetResolver
  /** Bumps when fonts/images change so cached drawings refresh. */
  renderVersion: number
  /** Element currently edited in an HTML overlay (hidden on canvas). */
  hiddenId: string | null
  /** Static rendering (thumbnails): no interaction at all. */
  static?: boolean
  /** Print preview: draw exactly what the PDF prints (no editor placeholders). */
  print?: boolean
}

export const StageCtx = createContext<StageInteraction | null>(null)

export function useStageCtx() {
  const c = useContext(StageCtx)
  if (!c) throw new Error('StageCtx missing')
  return c
}
