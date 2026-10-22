import type { DocState, EditorState, LibraryState } from '@/core/editor/editorStore'
import { isEmptyChangeSet, type ChangeSet, type StorageBackend } from './backend'
import { diffById } from './diff'
import { getBackend } from './index'
import { useSaveStatus } from './saveStatus'

interface Snapshot {
  doc: DocState | null
  library: LibraryState
}

/**
 * Persist changes from the editor store (browser storage or a project folder).
 * Changed rows are found by reference comparison (immer structural sharing),
 * debounced, and written in one step.
 */
export function startAutosave(
  store: {
    getState: () => EditorState
    subscribe: (fn: (s: EditorState, prev: EditorState) => void) => () => void
  },
  opts: { delayMs?: number; backend?: StorageBackend } = {},
) {
  const backend = opts.backend ?? getBackend()
  const delay = opts.delayMs ?? 600
  // `saved`: what the last flush was asked to write. `written`: what storage
  // really holds. They differ after a failed write, so the next one retries it.
  let saved: Snapshot = pick(store.getState())
  let written: Snapshot = saved
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: Promise<void> = Promise.resolve()

  const flush = (snap: Snapshot = pick(store.getState())) => {
    if (timer) clearTimeout(timer)
    timer = null
    saved = snap
    running = running.then(async () => {
      if (await write(backend, written, snap)) written = snap
    })
    return running
  }

  const unsub = store.subscribe((s, prevState) => {
    if (s.doc === saved.doc && s.library === saved.library) return
    // Switching projects: write what the old project still had pending (from
    // the state before the switch), then start the new baseline without writing.
    if (!s.doc || !saved.doc || s.doc.project.id !== saved.doc.project.id) {
      if (timer) void flush(pick(prevState))
      const fresh = pick(s)
      saved = fresh
      running = running.then(() => void (written = fresh))
      return
    }
    useSaveStatus.setState({ status: 'pending' })
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, delay)
  })

  const onHide = () => {
    if (timer) void flush()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
  }

  return {
    flush,
    stop() {
      unsub()
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onHide)
        document.removeEventListener('visibilitychange', onHide)
      }
    },
  }
}

const pick = (s: EditorState): Snapshot => ({ doc: s.doc, library: s.library })

export function changesBetween(
  prev: { doc: DocState; library: LibraryState },
  next: { doc: DocState; library: LibraryState },
): ChangeSet {
  const templates = diffById(prev.doc.templates, next.doc.templates)
  const cards = diffById(prev.doc.cards, next.doc.cards)
  return {
    projectChanged:
      prev.doc.project !== next.doc.project ||
      templates.put.length + templates.del.length + cards.put.length + cards.del.length > 0,
    templates,
    cards,
    stylePresets: diffById(prev.doc.stylePresets, next.doc.stylePresets),
    assets: diffById(prev.library.assets, next.library.assets),
    fonts: diffById(prev.library.fonts, next.library.fonts),
  }
}

/** Write the changes from `prev` to `next`. True when storage now holds `next`. */
async function write(backend: StorageBackend, prev: Snapshot, next: Snapshot): Promise<boolean> {
  if (!next.doc || !prev.doc) return true
  // Never diff one project against another: that would delete the first one's rows.
  if (prev.doc.project.id !== next.doc.project.id) return true
  const nextState = { doc: next.doc, library: next.library }
  const changes = changesBetween({ doc: prev.doc, library: prev.library }, nextState)
  if (isEmptyChangeSet(changes)) return true
  useSaveStatus.setState({ status: 'saving' })
  try {
    await backend.writeChanges(nextState, changes)
    useSaveStatus.setState({ status: 'saved', error: undefined })
    return true
  } catch (e) {
    console.error('Autosave failed', e)
    useSaveStatus.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    return false
  }
}
