import { commit } from '@/core/editor/editorStore'
import type { Keyword } from '@/core/model/types'

/** Replace the project's keyword list (undoable). */
export function setKeywords(keywords: Keyword[], coalesce?: string) {
  commit((d) => {
    d.project.keywords = keywords
  }, coalesce)
}
