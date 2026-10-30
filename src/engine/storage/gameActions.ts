/**
 * The actions behind the Engine's File menu and Scenes panel: each keeps the game
 * store, the database and "last open" in step. Opening a map scene loads its map
 * into the 3D editor (engineStore), which autosaves maps as before.
 */
import { newMapDoc } from '../model/map'
import { mapScene, newGame, newPictureScene, type GameDoc, type Scene } from '../model/game'
import { useEngine } from '../store/engineStore'
import { useGame } from '../store/gameStore'
import { startEngineAutosave } from './autosave'
import { games } from './games'
import { maps } from './maps'
import { useEngineSaveStatus } from './saveStatus'

/** Show a scene in the centre; a map scene loads its map into the 3D editor. */
export async function showScene(id: string) {
  const scene = useGame.getState().game.scenes.find((s) => s.id === id)
  if (!scene) return
  if (scene.kind === 'map') {
    const map = (await maps.load(scene.mapId)) ?? newMapDoc(scene.name)
    if (map.id !== scene.mapId) map.id = scene.mapId
    useEngine.getState().setMap(map)
    useGame.getState().setPanel('map')
  }
  useGame.getState().setView({ kind: 'scene', id })
}

async function openGameDoc(game: GameDoc) {
  useGame.getState().setGame(game)
  await games.setLastOpen(game.id)
  const first = game.startScene ?? game.scenes[0]?.id
  if (first) await showScene(first)
}

export async function openGame(id: string) {
  const g = await games.load(id)
  if (g) await openGameDoc(g)
}

export async function createGame(name = 'New game') {
  const g = newGame(name)
  const town = newPictureScene('Start')
  g.scenes.push(town)
  g.startScene = town.id
  await games.save(g)
  await openGameDoc(g)
}

export async function renameGame(id: string, name: string) {
  const clean = name.trim() || 'Untitled game'
  if (useGame.getState().game.id === id)
    useGame.getState().commit((g) => {
      g.name = clean
    })
  else {
    const g = await games.load(id)
    if (g) await games.save({ ...g, name: clean })
  }
}

export async function duplicateGame(id: string) {
  await flushGame()
  const copy = await games.duplicate(id)
  if (copy) await openGameDoc(copy)
}

export async function deleteGame(id: string) {
  const current = useGame.getState().game.id === id
  await games.remove(id)
  if (!current) return
  const [next] = await games.list()
  if (next) await openGame(next.id)
  else await createGame('My game')
}

/** Add a scene to the open game and show it. */
export async function addScene(kind: Scene['kind'], name?: string) {
  let scene: Scene
  if (kind === 'map') {
    const map = newMapDoc(name ?? 'New map')
    await maps.save(map)
    scene = mapScene(map.id, map.name)
  } else scene = newPictureScene(name ?? 'New scene')
  useGame.getState().commit((g) => {
    g.scenes.push(scene)
    g.startScene ??= scene.id
  })
  await showScene(scene.id)
  return scene
}

export function deleteScene(id: string) {
  const st = useGame.getState()
  st.commit((g) => {
    g.scenes = g.scenes.filter((s) => s.id !== id)
    if (g.startScene === id) g.startScene = g.scenes[0]?.id ?? null
  })
  if (st.view.kind === 'scene' && st.view.id === id) {
    const next = useGame.getState().game.scenes[0]
    if (next) void showScene(next.id)
    else st.setView({ kind: 'none' })
  }
}

// ---------- autosave ----------

let flushNow: (() => Promise<void>) | null = null
export const flushGame = () => flushNow?.() ?? Promise.resolve()

function startGameAutosave(delay = 600) {
  let saved = useGame.getState().game
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: Promise<void> = Promise.resolve()
  const flush = () => {
    if (timer) clearTimeout(timer)
    timer = null
    const game = useGame.getState().game
    saved = game
    useEngineSaveStatus.setState({ status: 'saving' })
    running = running.then(async () => {
      try {
        await games.save(game)
        if (useGame.getState().game === game) useEngineSaveStatus.setState({ status: 'saved' })
      } catch (e) {
        useEngineSaveStatus.setState({ status: 'error', error: String(e) })
      }
    })
    return running
  }
  flushNow = flush
  const unsub = useGame.subscribe((s, prev) => {
    if (s.game === saved) return
    if (s.game.id !== prev.game.id) {
      saved = s.game
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
    flushNow = null
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', onHide)
  }
}

/**
 * Open last session's game (moving older maps into "My game" on first use), show
 * its start scene, and autosave both the game and the open map. Returns a stop
 * function. Call once when the Engine mounts.
 */
export async function initEngine(): Promise<() => void> {
  const game = await games.ensureGame()
  if (!game.scenes.length) {
    // A first run: a demo map scene, so there's something to look at.
    const demo = useEngine.getState().map
    await maps.save(demo)
    game.scenes.push(mapScene(demo.id, demo.name))
    game.startScene = game.scenes[0].id
    await games.save(game)
  }
  await openGameDoc(game)
  const stopMaps = startEngineAutosave()
  const stopGame = startGameAutosave()
  return () => {
    stopMaps()
    stopGame()
  }
}

// ---------- game files ----------

/** Download the open game as a `.hsgame` file. */
export async function exportGame() {
  await flushGame()
  const { exportGameFile, safeFileName } = await import('../io/gameFile')
  const { db } = await import('./db')
  const { playtestDb } = await import('@/playtest/library')
  const game = useGame.getState().game
  const gameMaps = []
  const assetIds = new Set<string>()
  for (const s of game.scenes) {
    if (s.kind !== 'map') continue
    const map = await maps.load(s.mapId)
    if (!map) continue
    gameMaps.push(map)
    for (const t of map.tilesets) if (t.assetId) assetIds.add(t.assetId)
  }
  const own = await db.assets.where('gameId').equals(game.id).toArray()
  const tiles = (await db.assets.bulkGet([...assetIds])).filter((a) => !!a)
  const packs = []
  for (const src of game.sources) {
    if (src.kind !== 'pack') continue
    const row = await playtestDb().packs.get(src.id)
    if (row) packs.push({ id: src.id, bytes: new Uint8Array(await row.file.arrayBuffer()) })
  }
  const file = await exportGameFile({ game, maps: gameMaps, assets: [...own, ...tiles], packs })
  const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeFileName(game.name)}.hsgame`
  a.click()
  URL.revokeObjectURL(url)
}

/** Import a `.hsgame` file as a new game and open it. */
export async function importGame(text: string) {
  const { parseGameFile } = await import('../io/gameFile')
  const { db } = await import('./db')
  const { addPack } = await import('@/playtest/library')
  const parts = parseGameFile(text)
  for (const m of parts.maps) await maps.save(m)
  for (const a of parts.assets) {
    // Tileset images keep no game; scene images join the imported game.
    const existing = await db.assets.get(a.id)
    await db.assets.put(existing ? { ...existing } : a)
  }
  for (const p of parts.packs) await addPack(p.bytes)
  await games.save(parts.game)
  await openGameDoc(parts.game)
}
