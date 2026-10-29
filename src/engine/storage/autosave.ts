/**
 * Persist the open map to IndexedDB a short moment after it stops changing, the
 * same debounce-and-flush shape as the card editor's autosave
 * (src/storage/autosave.ts), but for a single MapDoc. Also records which map is
 * open so the engine reopens it next time, and flushes when the tab hides.
 */
import { maps as defaultMaps, type MapStore } from './maps'
import { useEngineSaveStatus } from './saveStatus'
import { useEngine } from '../store/engineStore'
import type { MapDoc } from '../model/map'

export function startEngineAutosave(opts: { delayMs?: number; store?: MapStore } = {}) {
  const store = opts.store ?? defaultMaps
  const delay = opts.delayMs ?? 600
  let saved: MapDoc = useEngine.getState().map
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: Promise<void> = Promise.resolve()

  const flush = (map: MapDoc = useEngine.getState().map) => {
    if (timer) clearTimeout(timer)
    timer = null
    saved = map
    useEngineSaveStatus.setState({ status: 'saving' })
    running = running.then(async () => {
      try {
        await store.save(map)
        if (useEngine.getState().map === map) useEngineSaveStatus.setState({ status: 'saved' })
      } catch (e) {
        useEngineSaveStatus.setState({ status: 'error', error: String(e) })
      }
    })
    return running
  }

  const unsub = useEngine.subscribe((s, prev) => {
    if (s.map === saved) return
    // A different map opened: remember it, and don't rewrite it unless it changes.
    if (s.map.id !== prev.map.id) {
      saved = s.map
      void store.setLastOpen(s.map.id)
      useEngineSaveStatus.setState({ status: 'saved' })
      return
    }
    useEngineSaveStatus.setState({ status: 'pending' })
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flush(), delay)
  })

  const onHide = () => {
    if (timer) void flush()
  }
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', onHide)

  return () => {
    unsub()
    if (timer) void flush()
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', onHide)
  }
}
