import { mergeLayers } from '../model/layering'
import { findElement } from '../model/tree'
import type { Card, Element, Template } from '../model/types'
import type { EditorState } from './editorStore'

export function currentCard(s: EditorState): Card | undefined {
  const id = s.view.cardId
  return id && s.doc ? s.doc.cards[id] : undefined
}

export function sortedCards(s: EditorState): Card[] {
  return s.doc ? Object.values(s.doc.cards).sort((a, b) => a.order - b.order) : []
}

export function templatesOfSide(s: EditorState, side: 'front' | 'back'): Template[] {
  return s.doc
    ? Object.values(s.doc.templates)
        .filter((t) => t.side === side)
        .sort((a, b) => a.createdAt - b.createdAt)
    : []
}

/** The template shown on the canvas right now. */
export function activeTemplate(s: EditorState): Template | undefined {
  if (!s.doc) return undefined
  if (s.view.mode === 'template')
    return s.view.templateId ? s.doc.templates[s.view.templateId] : undefined
  const card = currentCard(s)
  const id = card ? (s.view.side === 'front' ? card.frontTemplateId : card.backTemplateId) : null
  return id ? s.doc.templates[id] : undefined
}

/** Card-only elements on the current side (empty in template mode). */
export function localElements(s: EditorState): Element[] {
  if (s.view.mode === 'template') return []
  return currentCard(s)?.local[s.view.side] ?? []
}

/** Everything that can be selected on the canvas, bottom to top (drawing order). */
export function surfaceElements(s: EditorState): Element[] {
  return mergeLayers(activeTemplate(s)?.elements ?? [], localElements(s)).map((l) => l.el)
}

export type Owner = 'template' | 'local'

export function ownerOf(s: EditorState, id: string): Owner | undefined {
  if (findElement(localElements(s), id)) return 'local'
  if (findElement(activeTemplate(s)?.elements ?? [], id)) return 'template'
  return undefined
}

export function findSurfaceElement(s: EditorState, id: string): Element | undefined {
  return findElement(localElements(s), id) ?? findElement(activeTemplate(s)?.elements ?? [], id)
}

/** Can the element's layout (geometry, style) be edited in the current mode? */
export function isLayoutEditable(s: EditorState, id: string): boolean {
  const owner = ownerOf(s, id)
  return owner === 'local' || (owner === 'template' && s.view.mode === 'template')
}

export function selectedElements(s: EditorState): Element[] {
  return s.view.selection.map((id) => findSurfaceElement(s, id)).filter((e): e is Element => !!e)
}
