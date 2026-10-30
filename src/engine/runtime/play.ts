import { openScene, useGame } from '../store/gameStore'
import { flushGame } from '../storage/gameActions'
import { startRuntime } from './runtime'

/** Play the open game from its start scene, or from the scene that's open. */
export function playGame(fromHere: boolean) {
  void flushGame()
  const st = useGame.getState()
  const scene = openScene(st)
  startRuntime(st.game, fromHere && scene ? scene.id : undefined)
}
