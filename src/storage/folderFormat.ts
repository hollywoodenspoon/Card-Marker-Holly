import type { DocState, LibraryState } from '@/core/editor/editorStore'
import type { Asset, FontAsset } from '@/core/model/types'
import type { ProjectBundle } from './projectFile'

/**
 * A project saved as a folder (desktop app):
 *
 *   project.json        everything except the picture and font files
 *   images/<id>.<ext>   the uploaded pictures, untouched
 *   fonts/<id>.<ext>    the uploaded fonts
 */
export const PROJECT_FILE = 'project.json'
export const FOLDER_FORMAT = 'card-maker-folder'

type FileRef = { file: string }
export interface FolderProjectFile {
  format: typeof FOLDER_FORMAT
  version: 1
  savedAt: number
  app: { name: string; version: string }
  project: DocState['project']
  templates: DocState['templates'][string][]
  cards: DocState['cards'][string][]
  stylePresets: DocState['stylePresets'][string][]
  assets: (Omit<Asset, 'blob'> & FileRef)[]
  fonts: (Omit<FontAsset, 'blob'> & FileRef)[]
}

const IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
}
const FONT_MIME: Record<string, string> = {
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
}

export const assetFile = (a: Pick<Asset, 'id' | 'mime'>) =>
  `images/${a.id}.${IMAGE_EXT[a.mime] ?? 'bin'}`

export const fontFile = (f: Pick<FontAsset, 'id' | 'fileName'>) => {
  const ext = /\.(ttf|otf|woff2?)$/i.exec(f.fileName)?.[1].toLowerCase() ?? 'ttf'
  return `fonts/${f.id}.${ext}`
}

// Thumbnails are drawn live, never stored.
const noThumb = <T extends { thumbnail?: Blob }>({ thumbnail: _t, ...rest }: T) => rest as T

/** The project.json contents for a project. */
export function toFolderFile(
  doc: DocState,
  library: LibraryState,
  app: FolderProjectFile['app'],
  savedAt = Date.now(),
): FolderProjectFile {
  return {
    format: FOLDER_FORMAT,
    version: 1,
    savedAt,
    app,
    project: { ...doc.project, updatedAt: savedAt },
    templates: Object.values(doc.templates).map(noThumb),
    cards: Object.values(doc.cards).map(noThumb),
    stylePresets: Object.values(doc.stylePresets),
    assets: Object.values(library.assets).map(({ blob: _b, ...a }) => ({
      ...a,
      file: assetFile(a),
    })),
    fonts: Object.values(library.fonts).map(({ blob: _b, ...f }) => ({ ...f, file: fontFile(f) })),
  }
}

export const serializeFolderFile = (f: FolderProjectFile) => JSON.stringify(f, null, 2)

export function parseFolderFile(text: string): FolderProjectFile {
  let f: FolderProjectFile
  try {
    f = JSON.parse(text) as FolderProjectFile
  } catch {
    throw new Error('project.json is damaged (not valid JSON).')
  }
  if (f?.format !== FOLDER_FORMAT || !f.project) throw new Error('This folder is not a project.')
  if (f.version !== 1) throw new Error('This project was saved by a newer version of the app.')
  return f
}

const byId = <T extends { id: string }>(rows: T[] = []) =>
  Object.fromEntries(rows.map((r) => [r.id, r])) as Record<string, T>

/**
 * Rebuild the editor state from project.json, reading the picture and font
 * files with `read` (relative path → bytes, or null when missing). A missing
 * file keeps its entry with an empty blob, so saving never drops it.
 */
export async function fromFolderFile(
  f: FolderProjectFile,
  read: (relPath: string) => Promise<Uint8Array | null>,
): Promise<{ doc: DocState; library: LibraryState; missing: string[] }> {
  const missing: string[] = []
  const load = async (file: string, type: string) => {
    const bytes = await read(file)
    if (!bytes) missing.push(file)
    return new Blob(bytes ? [bytes as Uint8Array<ArrayBuffer>] : [], { type })
  }
  const assets = await Promise.all(
    (f.assets ?? []).map(async ({ file, ...a }) => ({ ...a, blob: await load(file, a.mime) })),
  )
  const fonts = await Promise.all(
    (f.fonts ?? []).map(async ({ file, ...ft }) => ({
      ...ft,
      blob: await load(file, FONT_MIME[file.split('.').pop() ?? ''] ?? 'font/ttf'),
    })),
  )
  return {
    doc: {
      project: f.project,
      templates: byId(f.templates),
      cards: byId(f.cards),
      stylePresets: byId(f.stylePresets),
    },
    library: { assets: byId(assets), fonts: byId(fonts) },
    missing,
  }
}

/** The same project under another id (a copied folder that clashes with one already listed). */
export function withProjectId<T extends { doc: DocState; library: LibraryState }>(
  s: T,
  projectId: string,
): T {
  const re = <R extends { projectId: string }>(rows: Record<string, R>) =>
    Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { ...r, projectId }])) as Record<
      string,
      R
    >
  return {
    ...s,
    doc: {
      project: { ...s.doc.project, id: projectId },
      templates: re(s.doc.templates),
      cards: re(s.doc.cards),
      stylePresets: re(s.doc.stylePresets),
    },
    library: { assets: re(s.library.assets), fonts: re(s.library.fonts) },
  }
}

export const bundleToState = (b: ProjectBundle): { doc: DocState; library: LibraryState } => ({
  doc: {
    project: b.project,
    templates: byId(b.templates),
    cards: byId(b.cards),
    stylePresets: byId(b.stylePresets),
  },
  library: { assets: byId(b.assets), fonts: byId(b.fonts) },
})
