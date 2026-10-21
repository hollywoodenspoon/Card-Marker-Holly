import { closeDoc, openDoc, useEditor } from '@/core/editor/editorStore'
import { createProject, type NewProjectOptions } from '@/core/model/factories'
import { sortedCards } from '@/core/editor/selectors'
import { getBackend } from '@/storage'
import { toast } from '@/ui/components/feedback'
import { registerProjectFonts } from '@/assets/fonts'
import { migrateAnchors } from '@/templates/sizeGroups'

/** Opening, creating and closing projects: glue between storage and the editor store. */

let flushAutosave: (() => Promise<void>) | null = null
export function setAutosaveFlusher(fn: () => Promise<void>) {
  flushAutosave = fn
}

/** Write any pending changes now. */
export const flushSaves = async () => {
  await flushAutosave?.()
}

export async function openProject(id: string): Promise<boolean> {
  await flushAutosave?.()
  const backend = getBackend()
  let loaded
  try {
    loaded = await backend.loadProject(id)
  } catch (e) {
    toast(`Could not open the project: ${e instanceof Error ? e.message : String(e)}`, {
      tone: 'error',
    })
    return false
  }
  if (!loaded) return false
  const { doc } = loaded
  const anchored = migrateAnchors(doc.project, doc.templates, Object.values(doc.cards))
  if (anchored.length) {
    const none = { put: [], del: [] }
    await backend.writeChanges(loaded, {
      projectChanged: false,
      templates: { put: anchored, del: [] },
      cards: none,
      stylePresets: none,
      assets: none,
      fonts: none,
    })
  }
  await registerProjectFonts(Object.values(loaded.library.fonts))
  openDoc(loaded.doc, loaded.library)
  const first = sortedCards(useEditor.getState())[0]
  useEditor.setState((s) => ({ view: { ...s.view, cardId: first?.id ?? null } }))
  for (const w of loaded.warnings ?? []) toast(w, { tone: 'error' })
  await backend.setSetting('lastProjectId', id)
  return true
}

export async function createAndOpenProject(name: string, opts?: string | NewProjectOptions) {
  const bundle = createProject(name, opts)
  await getBackend().saveBundle({ ...bundle, stylePresets: [], assets: [], fonts: [] })
  await openProject(bundle.project.id)
}

export async function goHome() {
  await flushAutosave?.()
  closeDoc()
  await getBackend().setSetting('lastProjectId', null)
}
