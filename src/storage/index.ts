import { desktop } from '@/platform/desktop'
import type { StorageBackend } from './backend'
import { dexieBackend } from './dexieBackend'
import { folderBackend, type FolderStore } from './folderBackend'

let backend: StorageBackend | null = null

/** Project folders in the desktop app, browser storage on the web. */
export function getBackend(): StorageBackend {
  if (!backend) {
    const bridge = desktop()
    backend = bridge ? folderBackend(bridge) : dexieBackend()
  }
  return backend
}

/** The folder store, when running as the desktop app. */
export const folderStore = (): FolderStore | null => {
  const b = getBackend()
  return b.kind === 'folder' ? (b as FolderStore) : null
}
