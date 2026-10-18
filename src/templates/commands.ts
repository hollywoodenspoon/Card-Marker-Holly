import { commit, setView, updateLibrary, useEditor } from '@/core/editor/editorStore'
import { updateElements } from '@/core/editor/elementCommands'
import { activeTemplate, currentCard, findSurfaceElement, ownerOf } from '@/core/editor/selectors'
import { createShape, createTemplate } from '@/core/model/factories'
import { newId } from '@/core/model/ids'
import { cloneWithNewIds, findElement, uniqueName } from '@/core/model/tree'
import type { FontAsset, Side, Template } from '@/core/model/types'
import { migrateFieldRename } from './fields'
import { setPartVisibility } from './overrides'
import { isVisibleOnCard } from './resolve'
import { saveCardAsTemplate } from './saveCardAsTemplate'
import { switchTemplate } from './switchTemplate'
import { exportTemplate, importTemplate } from './templateFile'

/**
 * Show/hide toggle from the layers panel:
 * - template mode: the part's default visibility
 * - card mode, template part: a per-card override
 * - card mode, card-only element: its own visibility
 */
export function toggleVisibility(id: string) {
  const s = useEditor.getState()
  const owner = ownerOf(s, id)
  if (!owner) return
  if (s.view.mode === 'card' && owner === 'template') {
    const el = findElement(activeTemplate(s)?.elements ?? [], id)
    const cardId = s.view.cardId
    if (!el || !cardId || el.toggleLocked) return
    const card = s.doc!.cards[cardId]
    const next = !isVisibleOnCard(el, card)
    commit((d) => {
      setPartVisibility(d.cards[cardId], el, next)
      d.cards[cardId].updatedAt = Date.now()
    })
    return
  }
  updateElements([id], (el) => void (el.defaultVisible = !el.defaultVisible))
}

export function toggleEditLock(id: string) {
  updateElements([id], (el) => void (el.editLocked = !el.editLocked))
}

export function renameElement(id: string, name: string) {
  updateElements([id], (el) => {
    el.name = name
  })
}

// ---------- template library ----------

export function editTemplate(id: string) {
  const t = useEditor.getState().doc?.templates[id]
  if (!t) return
  setView({
    mode: 'template',
    templateId: id,
    side: t.side,
    selection: [],
    editingTextId: null,
    cropId: null,
  })
}

export function newTemplate(side: Side) {
  const s = useEditor.getState()
  if (!s.doc) return
  const { project } = s.doc
  const names = Object.values(s.doc.templates).map((t) => t.name)
  const size = project.defaultSize
  const b = project.bleedMm
  const t = createTemplate(
    project.id,
    side,
    size,
    uniqueName(side === 'front' ? 'New front' : 'New back', names),
    [
      createShape(
        { xMm: -b, yMm: -b, wMm: size.widthMm + 2 * b, hMm: size.heightMm + 2 * b },
        { name: 'Background', fill: '#ffffff', toggleLocked: true },
      ),
    ],
  )
  commit((d) => void (d.templates[t.id] = t))
  editTemplate(t.id)
  return t.id
}

export function duplicateTemplate(id: string) {
  const s = useEditor.getState()
  const src = s.doc?.templates[id]
  if (!s.doc || !src) return
  const names = Object.values(s.doc.templates).map((t) => t.name)
  const now = Date.now()
  const copy: Template = {
    ...structuredClone(src),
    id: newId(),
    name: uniqueName(`${src.name} copy`, names),
    elements: src.elements.map((e) => cloneWithNewIds(structuredClone(e))),
    guides: src.guides.map((g) => ({ ...g, id: newId() })),
    createdAt: now,
    updatedAt: now,
  }
  commit((d) => void (d.templates[copy.id] = copy))
  return copy.id
}

export function renameTemplate(id: string, name: string) {
  commit((d) => {
    const t = d.templates[id]
    if (t) {
      t.name = name
      t.updatedAt = Date.now()
    }
  })
}

/** Delete a template. Cards using it move to another template of the same side (or none). */
export function deleteTemplate(id: string) {
  const s = useEditor.getState()
  const t = s.doc?.templates[id]
  if (!s.doc || !t) return
  const replacement = Object.values(s.doc.templates)
    .filter((x) => x.side === t.side && x.id !== id)
    .sort((a, b) => a.createdAt - b.createdAt)[0]
  commit((d) => {
    delete d.templates[id]
    for (const c of Object.values(d.cards)) {
      if (c.frontTemplateId === id) switchTemplate(c, 'front', replacement?.id ?? null)
      if (c.backTemplateId === id) switchTemplate(c, 'back', replacement?.id ?? null)
    }
  })
  if (s.view.templateId === id) setView({ mode: 'card', templateId: null, selection: [] })
}

/** Use a template for one side of the current card. */
export function applyTemplate(templateId: string, cardId = useEditor.getState().view.cardId) {
  const t = useEditor.getState().doc?.templates[templateId]
  if (!t || !cardId) return
  commit((d) => {
    const c = d.cards[cardId]
    if (c) switchTemplate(c, t.side, templateId)
  })
  setView({ side: t.side, mode: 'card', selection: [] })
}

/** Use a back template for every card in the deck. */
export function applyBackToAll(templateId: string) {
  commit((d) => {
    for (const c of Object.values(d.cards)) switchTemplate(c, 'back', templateId)
  })
}

export function saveCurrentCardAsTemplate(name: string) {
  const s = useEditor.getState()
  const card = currentCard(s)
  if (!s.doc || !card) return
  const side = s.view.side
  const tid = side === 'front' ? card.frontTemplateId : card.backTemplateId
  const t = saveCardAsTemplate(
    card,
    side,
    tid ? s.doc.templates[tid] : undefined,
    name,
    s.doc.project.defaultSize,
  )
  commit((d) => void (d.templates[t.id] = t))
  return t.id
}

/** Rename a field; values on cards using this template follow the new name. */
export function renameField(id: string, name: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (!el || !('fieldName' in el) || !name || name === el.fieldName) return
  const from = el.fieldName
  const tid = s.view.mode === 'template' ? s.view.templateId : null
  commit((d) => {
    const lists = tid ? [d.templates[tid]?.elements ?? []] : []
    for (const list of lists) {
      const e = findElement(list, id)
      if (e && 'fieldName' in e) {
        // Keep the layer name in step when it was just the field name.
        if (e.name === e.fieldName) e.name = name
        e.fieldName = name
      }
    }
    if (tid) {
      migrateFieldRename(Object.values(d.cards), tid, from, name)
      d.templates[tid].updatedAt = Date.now()
    }
  }, 'field:' + id)
}

export async function downloadTemplate(id: string) {
  const s = useEditor.getState()
  const t = s.doc?.templates[id]
  if (!t) return
  const file = await exportTemplate(t, s.library.assets, s.library.fonts, s.doc!.stylePresets)
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${t.name.replace(/[^\w\- ]+/g, '').trim() || 'template'}.cardtemplate.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function uploadTemplate(file: File, registerFonts: (f: FontAsset[]) => Promise<void>) {
  const s = useEditor.getState()
  if (!s.doc) return
  const data = JSON.parse(await file.text())
  const { template, assets, fonts, stylePresets } = importTemplate(
    data,
    s.doc.project.id,
    Object.values(s.library.fonts),
    { presets: Object.values(s.doc.stylePresets), assets: Object.values(s.library.assets) },
  )
  const names = Object.values(s.doc.templates).map((t) => t.name)
  template.name = uniqueName(template.name, names)
  template.size = { ...s.doc.project.defaultSize }
  await registerFonts(fonts)
  updateLibrary((l) => {
    for (const a of assets) l.assets[a.id] = a
    for (const f of fonts) l.fonts[f.id] = f
  })
  commit((d) => {
    d.templates[template.id] = template
    for (const p of stylePresets) d.stylePresets[p.id] = p
  })
  return template.id
}
