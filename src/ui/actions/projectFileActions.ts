import { useEditor } from '@/core/editor/editorStore'
import { exportProject, importProject } from '@/storage/projectFile'
import { loadProject, saveProjectBundle } from '@/storage/repo'
import { downloadBlob, safeFileName } from './download'
import { pickFiles } from './imageActions'

const EXT = '.cardproject.json'

async function save(file: Awaited<ReturnType<typeof exportProject>>) {
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  downloadBlob(blob, safeFileName(file.project.name, 'project') + EXT)
}

/** Download a backup of the open project. */
export async function exportOpenProject() {
  const s = useEditor.getState()
  if (s.doc) await save(await exportProject(s.doc, s.library))
}

/** Download a backup of a stored project (from the Home screen). */
export async function exportStoredProject(id: string) {
  const loaded = await loadProject(id)
  if (loaded) await save(await exportProject(loaded.doc, loaded.library))
}

/** Ask for a backup file and add it as a new project. Returns the new project id. */
export async function importProjectFromFile(): Promise<string | undefined> {
  const [f] = await pickFiles(`${EXT},.json,application/json`, false)
  if (!f) return
  let data: unknown
  try {
    data = JSON.parse(await f.text())
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const bundle = importProject(data)
  await saveProjectBundle(bundle)
  return bundle.project.id
}
