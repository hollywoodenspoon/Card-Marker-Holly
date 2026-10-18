import { useEditor } from '@/core/editor/editorStore'
import { findSurfaceElement, ownerOf } from '@/core/editor/selectors'
import type { ImageValue, RichText } from '@/core/model/types'
import { imageValueFor, textValueFor } from '@/templates/resolve'

/** Image value shown for an image field in the current mode (re-renders on change). */
export function useImageValue(id: string): ImageValue | undefined {
  const el = useEditor((s) => findSurfaceElement(s, id))
  const card = useEditor((s) =>
    s.view.mode === 'card' && ownerOf(s, id) === 'template' && s.view.cardId
      ? s.doc?.cards[s.view.cardId]
      : undefined,
  )
  return el?.type === 'imageField' ? imageValueFor(el, card) : undefined
}

export function useTextValue(id: string): RichText | undefined {
  const el = useEditor((s) => findSurfaceElement(s, id))
  const card = useEditor((s) =>
    s.view.mode === 'card' && ownerOf(s, id) === 'template' && s.view.cardId
      ? s.doc?.cards[s.view.cardId]
      : undefined,
  )
  return el?.type === 'text' ? (card ? textValueFor(el, card).text : el.defaultText) : undefined
}
