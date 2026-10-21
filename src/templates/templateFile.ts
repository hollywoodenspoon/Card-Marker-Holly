import { newId } from '@/core/model/ids'
import { flatten, walk } from '@/core/model/tree'
import type { Asset, Element, FontAsset, Keyword, StylePreset, Template } from '@/core/model/types'
import { base64ToBlob, blobToBase64 } from '@/storage/base64'

/** Portable template file: the template plus the images and fonts it uses. */
export interface TemplateFile {
  format: 'card-maker-template'
  version: 1
  template: Omit<Template, 'projectId' | 'thumbnail'>
  assets: (Omit<Asset, 'blob' | 'projectId'> & { data: string })[]
  fonts: (Omit<FontAsset, 'blob' | 'projectId'> & { data: string })[]
  /** Shared styles used by the template's texts (merged by name on import). */
  stylePresets?: Omit<StylePreset, 'projectId'>[]
  /** Project keywords, so the template looks the same elsewhere (merged by word on import). */
  keywords?: Keyword[]
}

/** `{name}` symbol tokens used in the template's texts. */
function usedSymbols(els: Element[]): Set<string> {
  const names = new Set<string>()
  for (const e of flatten(els)) {
    if (e.type !== 'text') continue
    for (const p of e.defaultText.paragraphs)
      for (const r of p.runs)
        for (const m of r.text.matchAll(/\{([A-Za-z0-9_-]+)\}/g)) names.add(m[1].toLowerCase())
  }
  return names
}

function usedFamilies(els: Element[]): Set<string> {
  const fams = new Set<string>()
  for (const e of flatten(els)) {
    if (e.type !== 'text') continue
    fams.add(e.baseStyle.fontFamily)
    for (const p of e.defaultText.paragraphs)
      for (const r of p.runs) if (r.style?.fontFamily) fams.add(r.style.fontFamily)
  }
  return fams
}

export async function exportTemplate(
  t: Template,
  assets: Record<string, Asset>,
  fonts: Record<string, FontAsset>,
  presets: Record<string, StylePreset> = {},
  keywords: Keyword[] = [],
): Promise<TemplateFile> {
  const assetIds = new Set<string>()
  const symbols = usedSymbols(t.elements)
  for (const a of Object.values(assets))
    if (a.tags.some((tag) => symbols.has(tag.toLowerCase()))) assetIds.add(a.id)
  const presetIds = new Set<string>()
  for (const e of flatten(t.elements)) {
    if (e.type === 'image') assetIds.add(e.assetId)
    if (e.type === 'imageField' && e.defaultAssetId) assetIds.add(e.defaultAssetId)
    if (e.type === 'iconRow' && e.assetId) assetIds.add(e.assetId)
    if (e.type === 'text' && e.stylePresetId) presetIds.add(e.stylePresetId)
  }
  const usedPresets = [...presetIds].map((id) => presets[id]).filter(Boolean)
  const fams = usedFamilies(t.elements)
  for (const p of usedPresets) if (p.style.fontFamily) fams.add(p.style.fontFamily)
  const { projectId: _p, thumbnail: _t, ...template } = t
  return {
    format: 'card-maker-template',
    version: 1,
    template: structuredClone(template),
    stylePresets: usedPresets.map(({ projectId: _pid, ...p }) => structuredClone(p)),
    ...(keywords.length ? { keywords: structuredClone(keywords) } : {}),
    assets: await Promise.all(
      [...assetIds]
        .map((id) => assets[id])
        .filter(Boolean)
        .map(async ({ blob, projectId: _pid, ...meta }) => ({
          ...meta,
          data: await blobToBase64(blob),
        })),
    ),
    fonts: await Promise.all(
      Object.values(fonts)
        .filter((f) => fams.has(f.family))
        .map(async ({ blob, projectId: _pid, ...meta }) => ({
          ...meta,
          data: await blobToBase64(blob),
        })),
    ),
  }
}

/**
 * Turn a template file into new rows for `projectId`. Everything gets fresh
 * ids. Already present in the project and reused: fonts (same family, weight
 * and style), styles (same name) and symbols (same symbol name).
 */
export function importTemplate(
  file: unknown,
  projectId: string,
  existingFonts: FontAsset[],
  existing: { presets?: StylePreset[]; assets?: Asset[]; keywords?: Keyword[] } = {},
): {
  template: Template
  assets: Asset[]
  fonts: FontAsset[]
  stylePresets: StylePreset[]
  /** Keywords from the file that the project doesn't have yet (same word, any case). */
  keywords: Keyword[]
} {
  const f = file as TemplateFile
  if (f?.format !== 'card-maker-template' || f.version !== 1 || !f.template)
    throw new Error('This is not a Hearthside Cardworks template file.')
  const assetMap = new Map<string, string>()
  const assets: Asset[] = []
  for (const { data, ...meta } of f.assets ?? []) {
    const tag = meta.tags?.[0]?.toLowerCase()
    const same = tag
      ? existing.assets?.find((a) => a.tags.some((t) => t.toLowerCase() === tag))
      : undefined
    if (same) {
      assetMap.set(meta.id, same.id)
      continue
    }
    const id = newId()
    assetMap.set(meta.id, id)
    assets.push({
      ...meta,
      tags: meta.tags ?? [],
      id,
      projectId,
      blob: base64ToBlob(data, meta.mime),
    })
  }
  const presetMap = new Map<string, string>()
  const stylePresets: StylePreset[] = []
  for (const p of f.stylePresets ?? []) {
    const same = existing.presets?.find((e) => e.name === p.name)
    if (same) {
      presetMap.set(p.id, same.id)
      continue
    }
    const id = newId()
    presetMap.set(p.id, id)
    stylePresets.push({ ...structuredClone(p), id, projectId })
  }
  const fonts: FontAsset[] = (f.fonts ?? [])
    .filter(
      (fo) =>
        !existingFonts.some(
          (e) => e.family === fo.family && e.weight === fo.weight && e.style === fo.style,
        ),
    )
    .map(({ data, ...meta }) => ({
      ...meta,
      id: newId(),
      projectId,
      blob: base64ToBlob(data, 'font/ttf'),
    }))

  const elements = structuredClone(f.template.elements)
  walk(elements, (e) => {
    e.id = newId()
    if (e.type === 'image') e.assetId = assetMap.get(e.assetId) ?? e.assetId
    if (e.type === 'iconRow' && e.assetId) e.assetId = assetMap.get(e.assetId) ?? e.assetId
    if (e.type === 'imageField' && e.defaultAssetId)
      e.defaultAssetId = assetMap.get(e.defaultAssetId) ?? e.defaultAssetId
    if (e.type === 'text' && e.stylePresetId) {
      const id = presetMap.get(e.stylePresetId)
      if (id) e.stylePresetId = id
      else delete e.stylePresetId
    }
  })
  const now = Date.now()
  // The anchored back belongs to the other project; the importer picks one here.
  const { backId: _back, ...rest } = structuredClone(f.template)
  return {
    template: {
      ...rest,
      edited: true,
      id: newId(),
      projectId,
      elements,
      guides: (f.template.guides ?? []).map((g) => ({ ...g, id: newId() })),
      createdAt: now,
      updatedAt: now,
    },
    assets,
    fonts,
    stylePresets,
    keywords: newKeywords(f.keywords ?? [], existing.keywords ?? []),
  }
}

const norm = (w: string) => w.trim().replace(/\s+/g, ' ').toLowerCase()
function newKeywords(incoming: Keyword[], have: Keyword[]): Keyword[] {
  const seen = new Set(have.map((k) => norm(k.word)))
  const out: Keyword[] = []
  for (const k of incoming) {
    if (!k.word?.trim() || seen.has(norm(k.word))) continue
    seen.add(norm(k.word))
    out.push({ ...structuredClone(k), id: newId() })
  }
  return out
}
