import type { DocState, EditorState, LibraryState } from '@/core/editor/editorStore'
import { db, type CardMakerDB } from './db'
import { diffById } from './diff'
import { useSaveStatus } from './saveStatus'

interface Snapshot {
  doc: DocState | null
  library: LibraryState
}

/**
 * Persist changes from the editor store to IndexedDB.
 * Changed rows are found by reference comparison (immer structural sharing),
 * debounced, and written in one transaction.
 */
export function startAutosave(
  store: { getState: () => EditorState; subscribe: (fn: (s: EditorState) => void) => () => void },
  opts: { delayMs?: number; database?: CardMakerDB } = {},
) {
  const d = opts.database ?? db
  const delay = opts.delayMs ?? 600
  let saved: Snapshot = pick(store.getState())
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: Promise<void> = Promise.resolve()

  const flush = () => {
    if (timer) clearTimeout(timer)
    timer = null
    const next = pick(store.getState())
    const prev = saved
    saved = next
    running = running.then(() => write(d, prev, next))
    return running
  }

  const unsub = store.subscribe((s) => {
    if (s.doc === saved.doc && s.library === saved.library) return
    // Switching projects: reset the baseline without writing.
    if (!s.doc || !saved.doc || s.doc.project.id !== saved.doc.project.id) {
      if (timer) flush()
      saved = pick(s)
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

async function write(d: CardMakerDB, prev: Snapshot, next: Snapshot) {
  if (!next.doc || !prev.doc) return
  const t = diffById(prev.doc.templates, next.doc.templates)
  const c = diffById(prev.doc.cards, next.doc.cards)
  const a = diffById(prev.library.assets, next.library.assets)
  const f = diffById(prev.library.fonts, next.library.fonts)
  const projectChanged =
    prev.doc.project !== next.doc.project ||
    t.put.length + t.del.length + c.put.length + c.del.length > 0
  if (!projectChanged && !a.put.length && !a.del.length && !f.put.length && !f.del.length) return
  useSaveStatus.setState({ status: 'saving' })
  try {
    await d.transaction('rw', [d.projects, d.templates, d.cards, d.assets, d.fonts], async () => {
      if (projectChanged) await d.projects.put({ ...next.doc!.project, updatedAt: Date.now() })
      if (t.put.length) await d.templates.bulkPut(t.put)
      if (t.del.length) await d.templates.bulkDelete(t.del)
      if (c.put.length) await d.cards.bulkPut(c.put)
      if (c.del.length) await d.cards.bulkDelete(c.del)
      if (a.put.length) await d.assets.bulkPut(a.put)
      if (a.del.length) await d.assets.bulkDelete(a.del)
      if (f.put.length) await d.fonts.bulkPut(f.put)
      if (f.del.length) await d.fonts.bulkDelete(f.del)
    })
    useSaveStatus.setState({ status: 'saved', error: undefined })
  } catch (e) {
    console.error('Autosave failed', e)
    useSaveStatus.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) })
  }
}
