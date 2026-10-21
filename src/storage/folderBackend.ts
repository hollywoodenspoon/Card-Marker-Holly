import { APP_NAME, APP_VERSION } from '@/app/appInfo'
import type { DocState, LibraryState } from '@/core/editor/editorStore'
import { newId } from '@/core/model/ids'
import { joinPath, normPath, type DesktopBridge } from '@/platform/desktop'
import type { LoadedProject, ProjectEntry, StorageBackend } from './backend'
import {
  assetFile,
  bundleToState,
  fontFile,
  fromFolderFile,
  parseFolderFile,
  PROJECT_FILE,
  serializeFolderFile,
  toFolderFile,
  withProjectId,
} from './folderFormat'

/** One project in the Recent list (kept in settings.json in the app's data folder). */
interface RecentEntry extends Omit<ProjectEntry, 'missing' | 'location'> {
  location: string
}
interface SettingsFile {
  recent: RecentEntry[]
  /** Where new projects go. Fixed once chosen, so renaming the app never moves them. */
  projectsDir?: string
  values: Record<string, unknown>
}

/** Folder-only actions used by the Home screen. */
export interface FolderStore extends StorageBackend {
  kind: 'folder'
  projectsDir(): Promise<string>
  /** False on Android until a folder for projects has been chosen (or its access was lost). */
  hasProjectsDir(): Promise<boolean>
  setProjectsDir(dir: string): Promise<void>
  /** Add an existing project folder to the list. Resolves to its id. */
  addFolder(dir: string): Promise<string>
  locationOf(id: string): Promise<string | undefined>
  /** Point a moved project at its new folder. */
  relocate(id: string, dir: string): Promise<void>
  bridge: DesktopBridge
}

const dec = new TextDecoder()
const RECOVERY_ORDER = [PROJECT_FILE, `${PROJECT_FILE}.tmp`, `${PROJECT_FILE}.bak`]

/** Turn a project name into a folder name that works on Windows, macOS and Linux. */
export const folderName = (name: string) =>
  name
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, 80) || 'Project'

export function folderBackend(fs: DesktopBridge): FolderStore {
  // Windows paths are case-insensitive and may use either slash.
  const key = (p: string) => (fs.platform === 'win32' ? normPath(p).toLowerCase() : normPath(p))
  const samePath = (a: string, b: string) => key(a) === key(b)
  let settings: SettingsFile | null = null
  let settingsWrite: Promise<void> = Promise.resolve()
  const settingsPath = fs.paths().then((p) => joinPath(p.userData, 'settings.json'))

  // What is on disk for the open project, so unchanged pictures are not rewritten.
  const written = new Map<string, { path: string; blob: Blob }>()

  async function readSettings(): Promise<SettingsFile> {
    if (settings) return settings
    const bytes = await fs.readFile(await settingsPath)
    let s: Partial<SettingsFile> = {}
    if (bytes)
      try {
        s = JSON.parse(dec.decode(bytes)) as SettingsFile
      } catch {
        console.warn('settings.json is damaged; starting fresh')
      }
    settings = { recent: s.recent ?? [], projectsDir: s.projectsDir, values: s.values ?? {} }
    return settings
  }
  async function saveSettings(change: (s: SettingsFile) => void) {
    const s = await readSettings()
    change(s)
    settingsWrite = settingsWrite.then(async () =>
      fs.writeFile(await settingsPath, JSON.stringify(s, null, 2), { atomic: true }),
    )
    await settingsWrite
  }
  const locationOf = async (id: string) =>
    (await readSettings()).recent.find((r) => r.id === id)?.location

  async function projectsDir() {
    const s = await readSettings()
    if (s.projectsDir) return s.projectsDir
    const docs = (await fs.paths()).documents
    // Before the rename the folder was "Card Maker": keep using it when it is there.
    const old = joinPath(docs, 'Card Maker')
    const dir = (await fs.exists(old)) ? old : joinPath(docs, APP_NAME)
    await saveSettings((x) => (x.projectsDir = dir))
    return dir
  }

  async function uniqueFolder(name: string) {
    const root = await projectsDir()
    const base = folderName(name)
    for (let i = 1; ; i++) {
      const dir = joinPath(root, i === 1 ? base : `${base} (${i})`)
      if (!(await fs.exists(dir))) return dir
    }
  }

  async function remember(dir: string, project: DocState['project']) {
    const location = normPath(dir)
    // Autosave runs often: refresh the Recent entry only when it shows something new.
    const top = (await readSettings()).recent[0]
    if (
      top?.id === project.id &&
      samePath(top.location, location) &&
      top.name === project.name &&
      JSON.stringify(top.defaultSize) === JSON.stringify(project.defaultSize) &&
      project.updatedAt - top.updatedAt < 60_000
    )
      return
    await saveSettings((s) => {
      const entry: RecentEntry = {
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        defaultSize: project.defaultSize,
        location,
      }
      s.recent = [
        entry,
        ...s.recent.filter((r) => r.id !== project.id && !samePath(r.location, location)),
      ]
    })
  }

  async function writeAll(
    dir: string,
    state: { doc: DocState; library: LibraryState },
    removed: string[] = [],
  ) {
    const file = toFolderFile(state.doc, state.library, { name: APP_NAME, version: APP_VERSION })
    const stale: string[] = []
    const put = async (id: string, path: string, blob: Blob) => {
      const before = written.get(id)
      if (before && before.path !== path) stale.push(before.path)
      // An empty blob is a file that went missing: keep the entry, write nothing.
      if ((before?.blob === blob && before.path === path) || !blob.size) return
      await fs.writeFile(joinPath(dir, path), new Uint8Array(await blob.arrayBuffer()))
      written.set(id, { path, blob })
    }
    for (const a of Object.values(state.library.assets)) await put(a.id, assetFile(a), a.blob)
    for (const f of Object.values(state.library.fonts)) await put(f.id, fontFile(f), f.blob)
    await fs.writeFile(joinPath(dir, PROJECT_FILE), serializeFolderFile(file), {
      atomic: true,
      backup: true,
    })
    // Files are removed only after project.json no longer points at them.
    for (const id of removed) {
      const w = written.get(id)
      if (w) stale.push(w.path)
      written.delete(id)
    }
    for (const p of stale) await fs.remove(joinPath(dir, p))
    await remember(dir, file.project)
  }

  /**
   * project.json, or, when it is missing or damaged (the app stopped mid-save),
   * the newest good copy: project.json.tmp (written in full before the swap), then .bak.
   */
  async function readProjectFile(dir: string) {
    let firstError: unknown = null
    for (const name of RECOVERY_ORDER) {
      const bytes = await fs.readFile(joinPath(dir, name))
      if (!bytes) continue
      try {
        return { file: parseFolderFile(dec.decode(bytes)), from: name }
      } catch (e) {
        firstError ??= e
      }
    }
    if (firstError) throw firstError
    return null
  }

  const hasProjectFile = async (dir: string) => {
    for (const name of RECOVERY_ORDER) if (await fs.exists(joinPath(dir, name))) return true
    return false
  }

  async function readFolder(dir: string): Promise<LoadedProject | null> {
    const read = await readProjectFile(dir)
    if (!read) return null
    const f = read.file
    const loaded = await fromFolderFile(f, (rel) => fs.readFile(joinPath(dir, rel)))
    written.clear()
    for (const a of Object.values(loaded.library.assets))
      written.set(a.id, { path: assetFile(a), blob: a.blob })
    for (const ft of Object.values(loaded.library.fonts))
      written.set(ft.id, { path: fontFile(ft), blob: ft.blob })
    const warnings: string[] = []
    if (read.from !== PROJECT_FILE)
      warnings.push(
        `${PROJECT_FILE} could not be read, so the project was restored from ${read.from}. The next save writes ${PROJECT_FILE} again.`,
      )
    if (loaded.missing.length)
      warnings.push(
        `${loaded.missing.length} file${loaded.missing.length === 1 ? ' is' : 's are'} missing from the project folder: ${loaded.missing.join(', ')}`,
      )
    return {
      doc: loaded.doc,
      library: loaded.library,
      warnings: warnings.length ? warnings : undefined,
    }
  }

  const backend: FolderStore = {
    kind: 'folder',
    bridge: fs,
    projectsDir,
    locationOf,
    async hasProjectsDir() {
      const s = await readSettings()
      if (!fs.needsProjectsFolder) return true
      return !!s.projectsDir && (await fs.exists(s.projectsDir).catch(() => false))
    },
    async setProjectsDir(dir) {
      await saveSettings((s) => (s.projectsDir = normPath(dir)))
    },

    async listProjects() {
      const { recent } = await readSettings()
      return Promise.all(
        recent.map(async (r) => ({
          ...r,
          missing: !(await hasProjectFile(r.location)),
        })),
      )
    },

    async loadProject(id) {
      const dir = await locationOf(id)
      return dir ? readFolder(dir) : null
    },

    async saveBundle(bundle) {
      const dir = await uniqueFolder(bundle.project.name)
      written.clear()
      await writeAll(dir, bundleToState(bundle))
    },

    async replaceBundle(bundle) {
      const dir = await locationOf(bundle.project.id)
      if (!dir || !(await fs.exists(dir))) return backend.saveBundle(bundle)
      // Reading the folder first lists its picture and font files, so the ones
      // the backup doesn't have are removed after project.json is written.
      const before = await readFolder(dir).catch(() => null)
      const state = bundleToState(bundle)
      const removed = before
        ? [
            ...Object.keys(before.library.assets).filter((id) => !state.library.assets[id]),
            ...Object.keys(before.library.fonts).filter((id) => !state.library.fonts[id]),
          ]
        : []
      await writeAll(dir, state, removed)
    },

    async writeChanges(state, changes) {
      const dir = await locationOf(state.doc.project.id)
      if (!dir) throw new Error('This project is no longer in the list of projects.')
      if (!(await fs.exists(dir)))
        throw new Error(`The project folder was moved or deleted: ${dir}`)
      await writeAll(dir, state, [...changes.assets.del, ...changes.fonts.del])
    },

    async deleteProject(id, opts) {
      const dir = await locationOf(id)
      if (dir && opts?.deleteFiles) await fs.removeProjectFolder(dir)
      await saveSettings((s) => (s.recent = s.recent.filter((r) => r.id !== id)))
    },

    async renameProject(id, name) {
      const dir = await locationOf(id)
      const loaded = dir && (await readFolder(dir))
      if (!loaded) return
      loaded.doc.project = { ...loaded.doc.project, name }
      await writeAll(dir, loaded)
    },

    async getSetting<T>(key: string) {
      return (await readSettings()).values[key] as T | undefined
    },
    async setSetting(key, value) {
      await saveSettings((s) => (s.values[key] = value))
    },

    async addFolder(dir) {
      const loaded = await readFolder(dir)
      if (!loaded) throw new Error(`There is no ${PROJECT_FILE} in this folder.`)
      const { recent } = await readSettings()
      const same = recent.find((r) => r.id === loaded.doc.project.id)
      if (same && !samePath(same.location, dir) && (await fs.exists(same.location))) {
        // A copy of a project that is already listed: give the copy its own id.
        const copy = withProjectId(loaded, newId())
        written.clear()
        await writeAll(dir, copy)
        return copy.doc.project.id
      }
      await remember(dir, loaded.doc.project)
      return loaded.doc.project.id
    },

    async relocate(id, dir) {
      const loaded = await readFolder(dir)
      if (!loaded) throw new Error(`There is no ${PROJECT_FILE} in this folder.`)
      if (loaded.doc.project.id !== id) throw new Error('This folder holds a different project.')
      await remember(dir, loaded.doc.project)
    },
  }
  return backend
}
