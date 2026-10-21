import type { DocState, LibraryState } from '@/core/editor/editorStore'
import type { CardSize } from '@/core/model/types'
import type { ProjectBundle } from './projectFile'

/**
 * Where projects live. The web build keeps them in the browser (IndexedDB);
 * the desktop app keeps each project in a real folder. The editor and the
 * autosave only talk to this interface.
 */
export interface StorageBackend {
  kind: 'browser' | 'folder'
  listProjects(): Promise<ProjectEntry[]>
  loadProject(id: string): Promise<LoadedProject | null>
  /** Store a complete new project (new or imported). */
  saveBundle(bundle: ProjectBundle): Promise<void>
  /**
   * Replace a stored project with a bundle of the same id (a backup restored
   * over it): everything not in the bundle is removed. Falls back to saveBundle
   * when the project isn't stored.
   */
  replaceBundle(bundle: ProjectBundle): Promise<void>
  /** Persist one autosave step: the full state plus what changed since the last write. */
  writeChanges(state: { doc: DocState; library: LibraryState }, changes: ChangeSet): Promise<void>
  /** Remove a project. `deleteFiles` (folders only) also deletes the folder from disk. */
  deleteProject(id: string, opts?: { deleteFiles?: boolean }): Promise<void>
  renameProject(id: string, name: string): Promise<void>
  getSetting<T>(key: string): Promise<T | undefined>
  setSetting(key: string, value: unknown): Promise<void>
}

export interface ProjectEntry {
  id: string
  name: string
  updatedAt: number
  defaultSize?: CardSize
  /** Folder on disk (desktop app). */
  location?: string
  /** The folder was moved or deleted. */
  missing?: boolean
}

export interface LoadedProject {
  doc: DocState
  library: LibraryState
  /** Problems worth telling the user about (e.g. image files missing from the folder). */
  warnings?: string[]
}

export interface RowChanges<T> {
  put: T[]
  del: string[]
}

export interface ChangeSet {
  projectChanged: boolean
  templates: RowChanges<DocState['templates'][string]>
  cards: RowChanges<DocState['cards'][string]>
  stylePresets: RowChanges<DocState['stylePresets'][string]>
  assets: RowChanges<LibraryState['assets'][string]>
  fonts: RowChanges<LibraryState['fonts'][string]>
}

export const isEmptyChangeSet = (c: ChangeSet) =>
  !c.projectChanged &&
  [c.templates, c.cards, c.stylePresets, c.assets, c.fonts].every(
    (r) => !r.put.length && !r.del.length,
  )
