import { commit, useEditor } from '@/core/editor/editorStore'
import { updateElements } from '@/core/editor/elementCommands'
import { findSurfaceElement, ownerOf } from '@/core/editor/selectors'
import type { ImageValue, RichText } from '@/core/model/types'
import { countValueFor, greyValueFor, imageValueFor, textValueFor } from './resolve'
import { richTextFromPlain } from '@/core/text/richtext'

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

/**
 * A card text field that still shows the template's starter text (the card has
 * no value of its own yet). Editing it selects all, so typing replaces it.
 */
export function showsStarterText(id: string): boolean {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'text' || target(id) !== 'cardField') return false
  const card = s.doc!.cards[s.view.cardId!]
  return card.fields[el.fieldName] === undefined
}

/** Clear a card's value so the template default shows again. */
export function resetFieldValue(id: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (!el || !('fieldName' in el) || target(id) !== 'cardField') return
  const cardId = s.view.cardId!
  commit((d) => {
    delete d.cards[cardId].fields[el.fieldName]
  })
}

export function hasCardValue(id: string): boolean {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (!el || !('fieldName' in el) || target(id) !== 'cardField') return false
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

/** Icon count shown for an icon row in the current mode. */
export function currentCount(id: string): number | undefined {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'iconRow') return undefined
  const card = target(id) === 'cardField' ? s.doc!.cards[s.view.cardId!] : undefined
  return countValueFor(el, card)
}

/** Set an icon row's count: the card's value, or the default on the template / card-only row. */
export function setCount(id: string, count: number, coalesce?: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'iconRow') return
  const n = Math.max(0, Math.min(99, Math.round(count)))
  if (target(id) === 'cardField') {
    const cardId = s.view.cardId!
    commit((d) => {
      const prev = d.cards[cardId].fields[el.fieldName]
      const grey = prev?.kind === 'count' ? prev.grey : undefined
      d.cards[cardId].fields[el.fieldName] = {
        kind: 'count',
        count: n,
        ...(grey !== undefined && { grey }),
      }
      d.cards[cardId].updatedAt = Date.now()
    }, coalesce)
  } else {
    updateElements([id], (e) => void (e.type === 'iconRow' && (e.defaultCount = n)), coalesce, {
      contentOnly: true,
    })
  }
}

/** Greyscale icon count shown for an icon row in the current mode. */
export function currentGrey(id: string): number | undefined {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'iconRow') return undefined
  const card = target(id) === 'cardField' ? s.doc!.cards[s.view.cardId!] : undefined
  return greyValueFor(el, card)
}

/** Set an icon row's grey icons: the card's value, or the default on the template / card-only row. */
export function setGrey(id: string, grey: number, coalesce?: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'iconRow') return
  const n = Math.max(0, Math.min(99, Math.round(grey)))
  if (target(id) === 'cardField') {
    const cardId = s.view.cardId!
    const count = countValueFor(el, s.doc!.cards[cardId])
    commit((d) => {
      d.cards[cardId].fields[el.fieldName] = { kind: 'count', count, grey: n }
      d.cards[cardId].updatedAt = Date.now()
    }, coalesce)
  } else {
    updateElements([id], (e) => void (e.type === 'iconRow' && (e.defaultGrey = n)), coalesce, {
      contentOnly: true,
    })
  }
}

/** Set a card's text value from plain text (proofreading view). */
export function setCardText(cardId: string, fieldName: string, text: string) {
  commit((d) => {
    const c = d.cards[cardId]
    if (!c) return
    c.fields[fieldName] = { kind: 'text', text: richTextFromPlain(text) }
    c.updatedAt = Date.now()
  }, `proof:${cardId}:${fieldName}`)
}

/** Set a card's icon count (data table). */
export function setCardCount(cardId: string, fieldName: string, count: number) {
  commit((d) => {
    const c = d.cards[cardId]
    if (!c) return
    const prev = c.fields[fieldName]
    const grey = prev?.kind === 'count' ? prev.grey : undefined
    c.fields[fieldName] = {
      kind: 'count',
      count: Math.max(0, Math.min(99, Math.round(count))),
      ...(grey !== undefined && { grey }),
    }
    c.updatedAt = Date.now()
  }, `table:${cardId}:${fieldName}`)
}

/** Put an uploaded image in a card's art box (data table); keeps the framing if it's the same image. */
export function setCardImage(cardId: string, fieldName: string, assetId: string) {
  commit((d) => {
    const c = d.cards[cardId]
    if (!c) return
    const prev = c.fields[fieldName]
    if (prev?.kind === 'image' && prev.assetId === assetId) return
    c.fields[fieldName] = { kind: 'image', assetId, offsetXMm: 0, offsetYMm: 0, zoom: 1 }
    c.updatedAt = Date.now()
  })
}

/** Remove a card's own value, so the template default shows again. */
export function clearCardValue(cardId: string, fieldName: string) {
  commit((d) => {
    const c = d.cards[cardId]
    if (!c || !(fieldName in c.fields)) return
    delete c.fields[fieldName]
    c.updatedAt = Date.now()
  })
}
