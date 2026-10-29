/**
 * Keyboard shortcuts' handle on the viewports: the mounted layout sets
 * `engine`, and the shortcuts act on the active pane through it.
 */
import { useView } from '../store/viewStore'
import type { Viewport3D } from './viewport3d'

/** Shortcut hooks for the active pane (used by the engine's keyboard shortcuts). */
export const viewportApi = {
  engine: null as Viewport3D | null,
  /** Step the active pane's FOV by `delta` degrees. */
  fovStep(delta: number) {
    const { active, setPane } = useView.getState()
    const cam = this.engine?.pane(active)
    if (!cam || cam.isOrtho) return
    cam.setFov(cam.fov + delta)
    setPane(active, { fov: cam.fov })
    this.engine?.report(active)
  },
  /** Turn the active pane's Game camera a quarter turn. */
  turn(steps: number) {
    const { active } = useView.getState()
    const cam = this.engine?.pane(active)
    if (!cam || cam.view !== 'game') return
    cam.turnGame(steps)
    this.engine?.report(active)
  },
}
