import { commit, setView, updateLibrary, useEditor } from '@/core/editor/editorStore'
import { updateElements } from '@/core/editor/elementCommands'
import {
  activeTemplate,
  currentCard,
  findSurfaceElement,
  isLayoutEditable,
  ownerOf,
} from '@/core/editor/selectors'
import { createShape, createTemplate } from '@/core/model/factories'
import { newId } from '@/core/model/ids'
import { cloneWithNewIds, findElement, uniqueName } from '@/core/model/tree'
import type { FontAsset, Side, Template } from '@/core/model/types'
import { isField, migrateFieldRename, templateFields } from './fields'
import { setPartVisibility } from './overrides'
import { isVisibleOnCard } from './resolve'
import { fieldDefaults, ruleHolds } from './rules'
import { saveCardAsTemplate } from './saveCardAsTemplate'
import { anchorOf, pickAnchor, sameSize } from './sizeGroups'
import { backFits, switchTemplate } from './switchTemplate'
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
    const defaults = fieldDefaults(activeTemplate(s)?.elements ?? [])
    const next = !isVisibleOnCard(el, card, defaults)
    const base = el.defaultVisible && ruleHolds(el.showIf, card, defaults)
    commit((d) => {
      setPartVisibility(d.cards[cardId], el, next, base)
      d.cards[cardId].updatedAt = Date.now()
    })
    return
  }
  updateElements([id], (el) => void (el.defaultVisible = !el.defaultVisible))
}

export function toggleEditLock(id: string) {
  updateElements([id], (el) => void (el.editLocked = !el.editLocked))
}

/**
 * Rename a part. A field's layer name and field name are kept the same, so
 * renaming a field's layer renames the field too (see `renameField`).
 */
export function renameElement(id: string, name: string) {
  const el = findSurfaceElement(useEditor.getState(), id)
  if (el && isField(el)) return renameField(id, name)
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
  // A new front matches the current card's back and is anchored to it.
  const card = currentCard(s)
  const cardBack = card?.backTemplateId ? s.doc.templates[card.backTemplateId] : undefined
  const size = side === 'front' && cardBack ? cardBack.size : project.defaultSize
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
  const anchor =
    side === 'front' && pickAnchor(project, s.doc.templates, t, cardBack ? [cardBack.id] : [])
  if (anchor) t.backId = anchor.back.id
  commit((d) => {
    if (anchor && anchor.created) d.templates[anchor.created.id] = anchor.created
    d.templates[t.id] = t
  })
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

/**
 * Delete a template. Cards using it move to another template of the same side
 * (or none); a deleted back's fronts are anchored to another back, of the same
 * size when there is one.
 */
export function deleteTemplate(id: string) {
  const s = useEditor.getState()
  const t = s.doc?.templates[id]
  if (!s.doc || !t) return
  const others = Object.values(s.doc.templates)
    .filter((x) => x.side === t.side && x.id !== id)
    .sort((a, b) => a.createdAt - b.createdAt)
  const replacement = others.find((x) => sameSize(x.size, t.size)) ?? others[0]
  commit((d) => {
    delete d.templates[id]
    if (t.side === 'back')
      for (const f of Object.values(d.templates))
        if (f.backId === id) {
          if (replacement) f.backId = replacement.id
          else delete f.backId
        }
    for (const c of Object.values(d.cards)) {
      if (c.frontTemplateId === id) switchTemplate(c, 'front', replacement?.id ?? null, d.templates)
      if (c.backTemplateId === id)
        switchTemplate(
          c,
          'back',
          anchorOf(d.templates, c.frontTemplateId)?.id ?? replacement?.id ?? null,
        )
    }
  })
  if (s.view.templateId === id) setView({ mode: 'card', templateId: null, selection: [] })
}

/**
 * Use a template for one side of the current card. A back must match the
 * front's size; returns 'size' (and changes nothing) when it doesn't.
 */
export function applyTemplate(
  templateId: string,
  cardId = useEditor.getState().view.cardId,
): 'ok' | 'size' | undefined {
  const s = useEditor.getState()
  const t = s.doc?.templates[templateId]
  const card = cardId ? s.doc?.cards[cardId] : undefined
  if (!s.doc || !t || !cardId || !card) return
  if (t.side === 'back' && !backFits(s.doc.templates, card, templateId)) return 'size'
  commit((d) => {
    const c = d.cards[cardId]
    if (c) switchTemplate(c, t.side, templateId, d.templates)
  })
  setView({ side: t.side, mode: 'card', selection: [] })
  return 'ok'
}

/**
 * Use a back template for every card in the deck whose front has the same
 * size. Returns how many cards kept their back because of a different size.
 */
export function applyBackToAll(templateId: string) {
  let skipped = 0
  commit((d) => {
    for (const c of Object.values(d.cards)) {
      if (backFits(d.templates, c, templateId)) switchTemplate(c, 'back', templateId)
      else skipped++
    }
  })
  return skipped
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

/**
 * Rename a field. Its layer gets the same name (and the other way round, via
 * `renameElement`), so names a game reads (e.g. A_AS) are what the Layers
 * panel shows. Values on cards using this template follow the new name; when
 * another part still uses the old name, the old value is kept for it too.
 */
export function renameField(id: string, name: string) {
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (!el || !isField(el) || !name || !isLayoutEditable(s, id)) return
  if (name === el.fieldName && name === el.name) return
  const from = el.fieldName
  const owner = ownerOf(s, id)
  const tid = s.view.mode === 'template' ? s.view.templateId : null
  const cardId = s.view.cardId
  commit((d) => {
    if (owner === 'template' && tid && d.templates[tid]) {
      const t = d.templates[tid]
      const e = findElement(t.elements, id)
      if (!e || !isField(e)) return
      e.name = name
      e.fieldName = name
      const stillUsed = templateFields(t as Template).some((f) => f.fieldName === from)
      migrateFieldRename(Object.values(d.cards), tid, from, name, stillUsed)
      t.updatedAt = Date.now()
    } else if (owner === 'local' && cardId && d.cards[cardId]) {
      const card = d.cards[cardId]
      const e = findElement(card.local[s.view.side], id)
      if (!e || !isField(e)) return
      e.name = name
      e.fieldName = name
      if (from !== name && card.fields[from] && !card.fields[name]) {
        card.fields[name] = card.fields[from]
        delete card.fields[from]
      }
      card.updatedAt = Date.now()
    }
  }, 'field:' + id)
}

export async function downloadTemplate(id: string) {
  const s = useEditor.getState()
  const t = s.doc?.templates[id]
  if (!t) return
  const file = await exportTemplate(
    t,
    s.library.assets,
    s.library.fonts,
    s.doc!.stylePresets,
    s.doc!.project.keywords,
  )
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
  const { template, assets, fonts, stylePresets, keywords } = importTemplate(
    data,
    s.doc.project.id,
    Object.values(s.library.fonts),
    {
      presets: Object.values(s.doc.stylePresets),
      assets: Object.values(s.library.assets),
      keywords: s.doc.project.keywords,
    },
  )
  const names = Object.values(s.doc.templates).map((t) => t.name)
  template.name = uniqueName(template.name, names)
  const anchor = template.side === 'front' && pickAnchor(s.doc.project, s.doc.templates, template)
  await registerFonts(fonts)
  updateLibrary((l) => {
    for (const a of assets) l.assets[a.id] = a
    for (const f of fonts) l.fonts[f.id] = f
  })
  if (anchor) template.backId = anchor.back.id
  commit((d) => {
    if (anchor && anchor.created) d.templates[anchor.created.id] = anchor.created
    d.templates[template.id] = template
    for (const p of stylePresets) d.stylePresets[p.id] = p
    if (keywords.length) d.project.keywords = [...(d.project.keywords ?? []), ...keywords]
  })
  return template.id
}
