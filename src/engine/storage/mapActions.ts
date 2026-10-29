/**
 * The actions behind the File menu and the Maps dialog: each keeps the store,
 * the database, and the "last open" setting in step, so the UI just calls one
 * function. Opening a map replaces the editor's map (which clears undo history).
 */
import { importMapFile } from '../io/mapFile'
import { newMapDoc } from '../model/map'
import { useEngine } from '../store/engineStore'
import { startEngineAutosave } from './autosave'
import { maps } from './maps'

async function open(id: string) {
  const map = await maps.load(id)
  if (!map) return
  useEngine.getState().setMap(map)
  await maps.setLastOpen(id)
}

export const openMap = open

export async function newMap() {
  const map = newMapDoc()
  await maps.save(map)
  useEngine.getState().setMap(map)
  await maps.setLastOpen(map.id)
}

export async function duplicateMap(id: string) {
  const copy = await maps.duplicate(id)
  if (copy) await open(copy.id)
}

export async function deleteMap(id: string) {
  const wasCurrent = useEngine.getState().map.id === id
  await maps.remove(id)
  if (!wasCurrent) return
  const rest = await maps.list()
  if (rest[0]) await open(rest[0].id)
  else await newMap()
}

export async function renameMap(id: string, name: string) {
  const clean = name.trim() || 'Untitled map'
  await maps.rename(id, clean)
  if (useEngine.getState().map.id === id) useEngine.getState().setName(clean)
}

export async function importMapFromText(text: string) {
  const map = importMapFile(text)
  await maps.save(map)
  await open(map.id)
}

/**
 * Open the map from last time (or seed the starter demo on a first run), then
 * start autosaving. Returns a stop function. Call once when the app mounts.
 */
export async function initEngineMaps(): Promise<() => void> {
  const last = await maps.getLastOpen()
  const existing = last ? await maps.load(last) : undefined
  if (existing) {
    useEngine.getState().setMap(existing)
  } else {
    const demo = useEngine.getState().map
    await maps.save(demo)
    await maps.setLastOpen(demo.id)
  }
  return startEngineAutosave()
}
