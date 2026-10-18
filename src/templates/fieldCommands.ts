import { commit, useEditor } from '@/core/editor/editorStore'
import { updateElements } from '@/core/editor/elementCommands'
import { findSurfaceElement, ownerOf } from '@/core/editor/selectors'
import type { ImageValue, RichText } from '@/core/model/types'
import { imageValueFor, textValueFor } from './resolve'

/**
 * Where content edits go:
 * - template mode: the element's default (shown on cards that have no value)
 * - card mode, template field: the card's value for that field name
 * - card mode, card-only element: the element itself
 */
function target(id: string): 'element' | 'cardField' | null {
  const s = useEditor.getState()
  const owner = ownerOf(s, id)
  if (!owner) return null
  return s.view.mode === 'card' && owner === 'template' ? 'cardField' : 'element'
}

export function setTextContent(id: string, text: RichText, coalesce?: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'text') return
  const t = target(id)
  if (t === 'cardField') {
    const cardId = s.view.cardId!
    commit((d) => {
      d.cards[cardId].fields[el.fieldName] = { kind: 'text', text }
      d.cards[cardId].updatedAt = Date.now()
    }, coalesce)
  } else if (t === 'element') {
    updateElements([id], (e) => void (e.type === 'text' && (e.defaultText = text)), coalesce, {
      contentOnly: true,
    })
  }
}

/** Current text content shown for an element in this mode. */
export function currentTextContent(id: string): RichText | undefined {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'text') return undefined
  if (target(id) === 'cardField') return textValueFor(el, s.doc!.cards[s.view.cardId!]).text
  return el.defaultText
}

/** Clear a card's value so the template default shows again. */
export function resetFieldValue(id: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (!el || (el.type !== 'text' && el.type !== 'imageField') || target(id) !== 'cardField') return
  const cardId = s.view.cardId!
  commit((d) => {
    delete d.cards[cardId].fields[el.fieldName]
  })
}

export function hasCardValue(id: string): boolean {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (!el || (el.type !== 'text' && el.type !== 'imageField') || target(id) !== 'cardField')
    return false
  return !!s.doc!.cards[s.view.cardId!]?.fields[el.fieldName]
}

export function currentImageValue(id: string): ImageValue | undefined {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'imageField') return undefined
  const card = target(id) === 'cardField' ? s.doc!.cards[s.view.cardId!] : undefined
  return imageValueFor(el, card)
}

/** Update an image field's picture or framing. */
export function setImageFieldValue(id: string, patch: Partial<ImageValue>, coalesce?: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'imageField') return
  const t = target(id)
  if (t === 'cardField') {
    const cardId = s.view.cardId!
    const cur = imageValueFor(el, s.doc!.cards[cardId])
    commit((d) => {
      d.cards[cardId].fields[el.fieldName] = { ...cur, ...patch, kind: 'image' }
      d.cards[cardId].updatedAt = Date.now()
    }, coalesce)
  } else if (t === 'element') {
    // On the template (or a card-only frame) only the picture and fit are stored.
    updateElements(
      [id],
      (e) => {
        if (e.type !== 'imageField') return
        if ('assetId' in patch) e.defaultAssetId = patch.assetId
        if (patch.fit) e.fit = patch.fit
      },
      coalesce,
      { contentOnly: true },
    )
  }
}
