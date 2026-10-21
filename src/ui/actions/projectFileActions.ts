import { goHome, openProject } from '@/app/session'
import { useEditor } from '@/core/editor/editorStore'
import {
  exportProject,
  importProject,
  projectIdOf,
  restoreProject,
  type ProjectFile,
} from '@/storage/projectFile'
import { askChoice, askConfirm, toast } from '@/ui/components/feedback'
import { getBackend } from '@/storage'
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
  const loaded = await getBackend().loadProject(id)
  if (loaded) await save(await exportProject(loaded.doc, loaded.library))
}

/** Put back what an overwrite replaced (closing the project first if it is open). */
async function undoOverwrite(id: string, before: ProjectFile) {
  const open = useEditor.getState().doc?.project.id === id
  if (open) await goHome()
  await getBackend().replaceBundle(restoreProject(before))
  if (open) await openProject(id)
  toast('Restored the copy that was on this device.')
}

const when = (t: number) =>
  new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const cardsText = (n: number) => `${n} card${n === 1 ? '' : 's'}`

/**
 * Ask for a backup file and add it. When the same project is already on this
 * device, ask first: overwrite it (with Undo right after) or make a new copy.
 * Returns the id of the project to open.
 */
export async function importProjectFromFile(): Promise<string | undefined> {
  const [f] = await pickFiles(`${EXT},.json,application/json`, false)
  if (!f) return
  let data: unknown
  try {
    data = JSON.parse(await f.text())
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const backend = getBackend()
  const id = projectIdOf(data)
  const existing = (await backend.listProjects()).find((p) => p.id === id && !p.missing)
  if (existing) {
    const file = data as ProjectFile
    const current = await backend.loadProject(id).catch(() => null)
    const here = current ? Object.keys(current.doc.cards).length : 0
    const older = file.project.updatedAt < existing.updatedAt
    const choice = await askChoice({
      title: `You already have “${existing.name}” on this device`,
      description:
        `On this device: last changed ${when(existing.updatedAt)}, ${cardsText(here)}. ` +
        `In the backup: last changed ${when(file.project.updatedAt)}, ${cardsText(file.cards?.length ?? 0)}.` +
        (older ? ' The backup is older than the copy here.' : '') +
        ' Overwrite replaces the copy here with the backup; a new copy keeps both.',
      choices: [
        { id: 'copy', label: 'Make a new copy', primary: true },
        { id: 'overwrite', label: 'Overwrite…', danger: true },
      ],
    })
    if (!choice) return
    if (choice === 'overwrite') {
      const sure = await askConfirm({
        title: `Overwrite “${existing.name}”?`,
        description:
          'Everything in the copy on this device is replaced by the backup. Undo appears right after, in case you change your mind.',
        okLabel: 'Overwrite',
        danger: true,
      })
      if (!sure) return
      // A safety copy of what is replaced, for Undo.
      const before = current && (await exportProject(current.doc, current.library))
      await backend.replaceBundle(restoreProject(data))
      toast(`Overwrote “${existing.name}” with the backup.`, {
        action: before ? { label: 'Undo', run: () => void undoOverwrite(id, before) } : undefined,
      })
      return id
    }
    const copy = importProject(data, ' (copy)')
    await backend.saveBundle(copy)
    return copy.project.id
  }
  const bundle = importProject(data)
  await backend.saveBundle(bundle)
  return bundle.project.id
}
