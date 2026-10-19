import { closeDoc, openDoc, useEditor } from '@/core/editor/editorStore'
import { createProject, type NewProjectOptions } from '@/core/model/factories'
import { sortedCards } from '@/core/editor/selectors'
import { loadProject, saveNewProject, setSetting } from '@/storage/repo'
import { registerProjectFonts } from '@/assets/fonts'

/** Opening, creating and closing projects: glue between storage and the editor store. */

let flushAutosave: (() => Promise<void>) | null = null
export function setAutosaveFlusher(fn: () => Promise<void>) {
  flushAutosave = fn
}

export async function openProject(id: string): Promise<boolean> {
  await flushAutosave?.()
  const loaded = await loadProject(id)
  if (!loaded) return false
  await registerProjectFonts(Object.values(loaded.library.fonts))
  openDoc(loaded.doc, loaded.library)
  const first = sortedCards(useEditor.getState())[0]
  useEditor.setState((s) => ({ view: { ...s.view, cardId: first?.id ?? null } }))
  await setSetting('lastProjectId', id)
  return true
}

export async function createAndOpenProject(name: string, opts?: string | NewProjectOptions) {
  const bundle = createProject(name, opts)
  await saveNewProject(bundle)
  await openProject(bundle.project.id)
}

export async function goHome() {
  await flushAutosave?.()
  closeDoc()
  await setSetting('lastProjectId', null)
}
