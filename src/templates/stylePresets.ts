import { commit, useEditor } from '@/core/editor/editorStore'
import { updateElements } from '@/core/editor/elementCommands'
import { findSurfaceElement } from '@/core/editor/selectors'
import { newId } from '@/core/model/ids'
import { walk } from '@/core/model/tree'
import type { Element, StylePreset, TextStyle } from '@/core/model/types'
import { effectiveText } from './resolve'

const STYLE_KEYS: (keyof TextStyle)[] = [
  'fontFamily',
  'sizePt',
  'color',
  'bold',
  'italic',
  'underline',
  'letterSpacingEm',
]

/** Unlink every text using `preset` in these elements, baking its values in so nothing changes visually. */
export function detachPreset(els: Element[], preset: StylePreset) {
  walk(els, (e) => {
    if (e.type === 'text' && e.stylePresetId === preset.id) {
      e.baseStyle = { ...e.baseStyle, ...preset.style }
      delete e.stylePresetId
    }
  })
}

/** Count texts linked to a preset across the project. */
export function presetUsage(presetId: string): number {
  const doc = useEditor.getState().doc
  if (!doc) return 0
  let n = 0
  const count = (els: Element[]) =>
    walk(els, (e) => {
      if (e.type === 'text' && e.stylePresetId === presetId) n++
    })
  Object.values(doc.templates).forEach((t) => count(t.elements))
  Object.values(doc.cards).forEach((c) => {
    count(c.local.front)
    count(c.local.back)
  })
  return n
}

/** New shared style from a text's current look, and link the text to it. */
export function createStyleFromText(id: string, name: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (!s.doc || el?.type !== 'text') return
  const style = effectiveText(el, s.doc.stylePresets).baseStyle
  const preset: StylePreset = {
    id: newId(),
    projectId: s.doc.project.id,
    name,
    style: Object.fromEntries(STYLE_KEYS.map((k) => [k, style[k]])),
  }
  commit((d) => void (d.stylePresets[preset.id] = preset))
  updateElements([id], (e) => void (e.type === 'text' && (e.stylePresetId = preset.id)))
  return preset.id
}

/** Link a text to a style, or unlink it (keeping its current look). */
export function linkStyle(id: string, presetId: string | null) {
  const s = useEditor.getState()
  const presets = s.doc?.stylePresets
  updateElements([id], (e) => {
    if (e.type !== 'text') return
    if (presetId) e.stylePresetId = presetId
    else {
      e.baseStyle = effectiveText(e as typeof e, presets).baseStyle
      delete e.stylePresetId
    }
  })
}

export function updateStyle(presetId: string, patch: Partial<TextStyle>, coalesce?: string) {
  commit((d) => {
    const p = d.stylePresets[presetId]
    if (p) p.style = { ...p.style, ...patch }
  }, coalesce)
}

export function renameStyle(presetId: string, name: string) {
  commit((d) => {
    const p = d.stylePresets[presetId]
    if (p) p.name = name
  })
}

/** Delete a style; texts using it keep their look and become unlinked. */
export function deleteStyle(presetId: string) {
  commit((d) => {
    const p = d.stylePresets[presetId]
    if (!p) return
    for (const t of Object.values(d.templates)) detachPreset(t.elements, p)
    for (const c of Object.values(d.cards)) {
      detachPreset(c.local.front, p)
      detachPreset(c.local.back, p)
    }
    delete d.stylePresets[presetId]
  })
}
