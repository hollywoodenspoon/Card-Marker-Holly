/**
 * Importing a map file: its pictures are restored and the map becomes a new map
 * scene in the open game. (Maps are opened, renamed and deleted as scenes.)
 */
import { parseMapFile, restoreAssets } from '../io/mapFile'
import { mapScene } from '../model/game'
import { useGame } from '../store/gameStore'
import { assets } from './assets'
import { showScene } from './gameActions'
import { maps } from './maps'

export async function importMapFromText(text: string) {
  const { map, assets: images } = parseMapFile(text)
  await restoreAssets(images, assets)
  await maps.save(map)
  const scene = mapScene(map.id, map.name)
  useGame.getState().commit((g) => void g.scenes.push(scene))
  await showScene(scene.id)
}
