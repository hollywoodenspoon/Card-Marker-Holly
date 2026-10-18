import { create } from 'zustand'
import { clamp } from '../units/units'
import { CSS_PX_PER_MM } from '../units/units'

/** Ruler thickness in screen px. */
export const RULER = 20

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 16

/**
 * Canvas viewport. `zoom` 1 = real size on a 96 dpi screen.
 * `panX/panY` are the screen position (px, relative to the stage) of the card's 0,0 mm.
 */
interface ViewportState {
  zoom: number
  panX: number
  panY: number
  stageW: number
  stageH: number
  /** Card size the viewport last fitted, so it can refit on size changes. */
  cardW: number
  cardH: number
}

export const useViewport = create<ViewportState>(() => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  stageW: 0,
  stageH: 0,
  cardW: 86,
  cardH: 54,
}))

export const pxPerMm = (zoom: number) => zoom * CSS_PX_PER_MM

export function fitToScreen(cardW?: number, cardH?: number) {
  const s = useViewport.getState()
  const w = cardW ?? s.cardW
  const h = cardH ?? s.cardH
  if (!s.stageW || !s.stageH) return useViewport.setState({ cardW: w, cardH: h })
  const margin = Math.min(64, Math.min(s.stageW, s.stageH) * 0.08)
  const availW = s.stageW - RULER - margin * 2
  const availH = s.stageH - RULER - margin * 2
  // leave room for the bleed (≈ 3 mm each side)
  const zoom = clamp(
    Math.min(availW / ((w + 8) * CSS_PX_PER_MM), availH / ((h + 8) * CSS_PX_PER_MM)),
    MIN_ZOOM,
    MAX_ZOOM,
  )
  const k = pxPerMm(zoom)
  useViewport.setState({
    zoom,
    cardW: w,
    cardH: h,
    panX: RULER + (s.stageW - RULER - w * k) / 2,
    panY: RULER + (s.stageH - RULER - h * k) / 2,
  })
}

/** Zoom keeping the screen point (sx, sy) fixed. Defaults to the stage centre. */
export function zoomAt(newZoom: number, sx?: number, sy?: number) {
  const s = useViewport.getState()
  const z = clamp(newZoom, MIN_ZOOM, MAX_ZOOM)
  const cx = sx ?? s.stageW / 2
  const cy = sy ?? s.stageH / 2
  const k0 = pxPerMm(s.zoom)
  const k1 = pxPerMm(z)
  const mx = (cx - s.panX) / k0
  const my = (cy - s.panY) / k0
  useViewport.setState({ zoom: z, panX: cx - mx * k1, panY: cy - my * k1 })
}

export const zoomIn = () => zoomAt(useViewport.getState().zoom * 1.25)
export const zoomOut = () => zoomAt(useViewport.getState().zoom / 1.25)

export function panBy(dx: number, dy: number) {
  useViewport.setState((s) => ({ panX: s.panX + dx, panY: s.panY + dy }))
}

/** Screen px → card mm. */
export function screenToMm(sx: number, sy: number) {
  const s = useViewport.getState()
  const k = pxPerMm(s.zoom)
  return { x: (sx - s.panX) / k, y: (sy - s.panY) / k }
}
