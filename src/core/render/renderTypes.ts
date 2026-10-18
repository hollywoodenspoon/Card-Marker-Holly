import type { Element, FieldValue, ImageValue, TextValue } from '../model/types'

/** One drawable item after template + card resolution. Mirrors the element tree. */
export interface RenderNode {
  element: Element
  source: 'template' | 'card'
  /** Shown dimmed (hidden part, still drawn while designing a template). */
  dimmed: boolean
  /** Resolved content for fields. */
  text?: TextValue
  image?: ImageValue
  children?: RenderNode[]
}

export type { FieldValue }

/** Supplies decoded images to the renderer. Implemented outside core (assets module). */
export interface AssetResolver {
  /** Returns a ready image, or undefined while it loads (subscribe to be told when ready). */
  getImage(assetId: string): CanvasImageSource | undefined
  getInfo(assetId: string): { widthPx: number; heightPx: number; isVector: boolean } | undefined
  subscribe(fn: () => void): () => void
}
