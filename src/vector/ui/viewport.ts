/** Zoom and pan of the Vector Maker canvas (screen px = doc px × zoom + pan). */
import type { Pt } from '../geometry'
import { useVector } from '../store'

let stage = { w: 800, h: 600 }
export const setStageSize = (w: number, h: number) => (stage = { w, h })

export function fitView() {
  const { doc } = useVector.getState()
  const pad = 48
  const zoom = Math.max(
    0.05,
    Math.min((stage.w - pad * 2) / doc.width, (stage.h - pad * 2) / doc.height, 8),
  )
  useVector.setState({
    view: { zoom, panX: (stage.w - doc.width * zoom) / 2, panY: (stage.h - doc.height * zoom) / 2 },
  })
}

/** Zoom to `zoom`, keeping the point under (sx, sy) in place (default: the stage centre). */
export function zoomTo(zoom: number, sx = stage.w / 2, sy = stage.h / 2) {
  const { view } = useVector.getState()
  const z = Math.max(0.05, Math.min(64, zoom))
  const k = z / view.zoom
  useVector.setState({
    view: { zoom: z, panX: sx - (sx - view.panX) * k, panY: sy - (sy - view.panY) * k },
  })
}

export const panBy = (dx: number, dy: number) =>
  useVector.setState((s) => ({
    view: { ...s.view, panX: s.view.panX + dx, panY: s.view.panY + dy },
  }))

export function toDoc(p: Pt): Pt {
  const { view } = useVector.getState()
  return { x: (p.x - view.panX) / view.zoom, y: (p.y - view.panY) / view.zoom }
}

export function toScreen(p: Pt): Pt {
  const { view } = useVector.getState()
  return { x: p.x * view.zoom + view.panX, y: p.y * view.zoom + view.panY }
}
