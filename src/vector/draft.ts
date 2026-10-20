/**
 * The Vector Maker keeps the drawing you're working on as a draft (in this
 * browser), so closing it, or the tab, doesn't lose work that isn't saved to
 * assets yet. One draft per project.
 */
import { parseDoc, type VectorDoc } from './model'

export interface VectorDraft {
  doc: VectorDoc
  assetId: string | null
  savedAt: number
}

const key = (projectId: string) => `cardmaker.vectorDraft.${projectId}`

export function readDraft(projectId: string): VectorDraft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(key(projectId)) ?? 'null') as
      (Omit<VectorDraft, 'doc'> & { doc: unknown }) | null
    const doc = raw && parseDoc(JSON.stringify(raw.doc))
    return raw && doc ? { doc, assetId: raw.assetId, savedAt: raw.savedAt } : null
  } catch {
    return null
  }
}

export function writeDraft(projectId: string, draft: VectorDraft) {
  try {
    localStorage.setItem(key(projectId), JSON.stringify(draft))
  } catch {
    /* storage full or unavailable: the draft is a convenience only */
  }
}

export function clearDraft(projectId: string) {
  try {
    localStorage.removeItem(key(projectId))
  } catch {
    /* ignore */
  }
}

/** Does the drawing have anything in it? */
export const hasContent = (doc: VectorDoc) => doc.layers.some((l) => l.items.length > 0)
