import type { DocState, LibraryState } from '@/core/editor/editorStore'
import { newId } from '@/core/model/ids'
import { walk } from '@/core/model/tree'
import type {
  Asset,
  Card,
  Element,
  FontAsset,
  Project,
  StylePreset,
  Template,
} from '@/core/model/types'
import { base64ToBlob, blobToBase64 } from './base64'

/** Full project backup: everything needed to restore it in another browser. */
export interface ProjectFile {
  format: 'card-maker-project'
  version: 1
  exportedAt: number
  project: Project
  templates: Omit<Template, 'thumbnail'>[]
  cards: Omit<Card, 'thumbnail'>[]
  stylePresets: StylePreset[]
  assets: (Omit<Asset, 'blob'> & { data: string })[]
  fonts: (Omit<FontAsset, 'blob'> & { data: string })[]
}

export interface ProjectBundle {
  project: Project
  templates: Template[]
  cards: Card[]
  stylePresets: StylePreset[]
  assets: Asset[]
  fonts: FontAsset[]
}

export async function exportProject(doc: DocState, library: LibraryState): Promise<ProjectFile> {
  const strip = <T extends { thumbnail?: Blob }>({ thumbnail: _t, ...rest }: T) => rest
  return {
    format: 'card-maker-project',
    version: 1,
    exportedAt: Date.now(),
    project: structuredClone(doc.project),
    templates: Object.values(doc.templates).map((t) => structuredClone(strip(t))),
    cards: Object.values(doc.cards).map((c) => structuredClone(strip(c))),
    stylePresets: Object.values(doc.stylePresets).map((p) => structuredClone(p)),
    assets: await Promise.all(
      Object.values(library.assets).map(async ({ blob, ...meta }) => ({
        ...meta,
        data: await blobToBase64(blob),
      })),
    ),
    fonts: await Promise.all(
      Object.values(library.fonts).map(async ({ blob, ...meta }) => ({
        ...meta,
        data: await blobToBase64(blob),
      })),
    ),
  }
}

/**
 * Rebuild a project from a backup file as a NEW project: every stored row
 * (project, templates, cards, assets, fonts, styles) gets a fresh id and all
 * references are rewritten. Element ids are kept, so per-card part toggles
 * and card-layer anchors still match.
 */
export function importProject(file: unknown, nameSuffix = ''): ProjectBundle {
  const f = file as ProjectFile
  if (f?.format !== 'card-maker-project' || f.version !== 1 || !f.project)
    throw new Error('This is not a Hearthside Cardworks project file.')
  const pid = newId()
  const ids = {
    templates: new Map<string, string>(),
    assets: new Map<string, string>(),
    presets: new Map<string, string>(),
    cards: new Map<string, string>(),
  }
  const remap = (m: Map<string, string>, id: string) => m.get(id) ?? id
  for (const t of f.templates ?? []) ids.templates.set(t.id, newId())
  for (const a of f.assets ?? []) ids.assets.set(a.id, newId())
  for (const p of f.stylePresets ?? []) ids.presets.set(p.id, newId())
  for (const c of f.cards ?? []) ids.cards.set(c.id, newId())

  const fixElements = (els: Element[]) =>
    walk(els, (e) => {
      if (e.type === 'image') e.assetId = remap(ids.assets, e.assetId)
      if (e.type === 'imageField' && e.defaultAssetId)
        e.defaultAssetId = remap(ids.assets, e.defaultAssetId)
      if (e.type === 'iconRow' && e.assetId) e.assetId = remap(ids.assets, e.assetId)
      if (e.type === 'text' && e.stylePresetId)
        e.stylePresetId = remap(ids.presets, e.stylePresetId)
    })

  const now = Date.now()
  const project: Project = {
    ...structuredClone(f.project),
    id: pid,
    name: f.project.name + nameSuffix,
    createdAt: now,
    updatedAt: now,
  }
  const print = project.print
  if (print.copies)
    print.copies = Object.fromEntries(
      Object.entries(print.copies).map(([id, n]) => [remap(ids.cards, id), n]),
    )
  if (print.order) print.order = print.order.map((id) => remap(ids.cards, id))
  if (project.decks)
    project.decks = project.decks.map((dk) => ({
      ...dk,
      id: newId(),
      counts: Object.fromEntries(
        Object.entries(dk.counts).map(([id, n]) => [remap(ids.cards, id), n]),
      ),
    }))
  // A printed deck id must follow its deck's new id.
  if (print.deckId) {
    const i = (f.project.decks ?? []).findIndex((dk) => dk.id === print.deckId)
    print.deckId = i >= 0 ? project.decks![i].id : null
  }
  const merge = project.merge
  if (merge?.frontTemplateId)
    merge.frontTemplateId = ids.templates.get(merge.frontTemplateId) ?? null
  if (merge?.backTemplateId) merge.backTemplateId = ids.templates.get(merge.backTemplateId) ?? null
  const templates: Template[] = (f.templates ?? []).map((t) => {
    const copy = structuredClone(t) as Template
    copy.id = ids.templates.get(t.id)!
    copy.projectId = pid
    fixElements(copy.elements)
    return copy
  })
  const cards: Card[] = (f.cards ?? []).map((c) => {
    const copy = structuredClone(c) as Card
    copy.id = ids.cards.get(c.id)!
    copy.projectId = pid
    copy.frontTemplateId = c.frontTemplateId ? (ids.templates.get(c.frontTemplateId) ?? null) : null
    copy.backTemplateId = c.backTemplateId ? (ids.templates.get(c.backTemplateId) ?? null) : null
    fixElements(copy.local.front)
    fixElements(copy.local.back)
    for (const v of Object.values(copy.fields))
      if (v.kind === 'image' && v.assetId) v.assetId = remap(ids.assets, v.assetId)
    return copy
  })
  return {
    project,
    templates,
    cards,
    stylePresets: (f.stylePresets ?? []).map((p) => ({
      ...structuredClone(p),
      id: ids.presets.get(p.id)!,
      projectId: pid,
    })),
    assets: (f.assets ?? []).map(({ data, ...meta }) => ({
      ...meta,
      id: ids.assets.get(meta.id)!,
      projectId: pid,
      blob: base64ToBlob(data, meta.mime),
    })),
    fonts: (f.fonts ?? []).map(({ data, ...meta }) => ({
      ...meta,
      id: newId(),
      projectId: pid,
      blob: base64ToBlob(data, 'font/ttf'),
    })),
  }
}
