/**
 * Viewport preferences: single or quad layout, which pane is maximised or
 * active, and each pane's view, projection and FOV. These are editor
 * preferences, kept on this device (localStorage), not in the map — except the
 * Game camera, which the map stores (MapDoc.camera).
 */
import { create } from 'zustand'
import { clampFov, type ViewName } from '../scene/viewMath'

export interface PaneConf {
  view: ViewName
  ortho: boolean
  fov: number
}

export interface ViewState {
  layout: 'single' | 'quad'
  maximised: number | null
  /** The pane keyboard shortcuts act on (the last one pointed at). */
  active: number
  panes: PaneConf[]
  perfMeter: boolean
  setLayout: (layout: 'single' | 'quad') => void
  toggleMaximise: (pane: number) => void
  setActive: (pane: number) => void
  setPane: (pane: number, conf: Partial<PaneConf>) => void
  togglePerf: () => void
}

const KEY = 'hearthside-engine.views'

/** Single opens as Perspective; the quad is Top / Front / Side / Perspective, like 3ds Max. */
export const DEFAULT_PANES: PaneConf[] = [
  { view: 'persp', ortho: false, fov: 50 },
  { view: 'top', ortho: true, fov: 50 },
  { view: 'front', ortho: true, fov: 50 },
  { view: 'right', ortho: true, fov: 50 },
]

function load(): Partial<ViewState> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || !Array.isArray(raw.panes) || raw.panes.length !== 4) return {}
    return {
      layout: raw.layout === 'quad' ? 'quad' : 'single',
      panes: raw.panes.map((p: PaneConf, i: number) => ({
        ...DEFAULT_PANES[i],
        ...p,
        fov: clampFov(p.fov ?? 50),
      })),
      perfMeter: !!raw.perfMeter,
    }
  } catch {
    return {}
  }
}

function save(s: ViewState) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ layout: s.layout, panes: s.panes, perfMeter: s.perfMeter }),
    )
  } catch {
    // Private windows and blocked storage: preferences just don't persist.
  }
}

export const useView = create<ViewState>((set, get) => ({
  layout: 'single',
  maximised: null,
  active: 0,
  panes: DEFAULT_PANES.map((p) => ({ ...p })),
  perfMeter: false,
  ...load(),
  setLayout: (layout) => {
    set({ layout, maximised: null, active: layout === 'single' ? 0 : get().active })
    save(get())
  },
  toggleMaximise: (pane) =>
    set({ maximised: get().maximised === pane ? null : pane, active: pane }),
  setActive: (active) => {
    if (get().active !== active) set({ active })
  },
  setPane: (pane, conf) => {
    const panes = get().panes.map((p, i) =>
      i === pane ? { ...p, ...conf, fov: clampFov(conf.fov ?? p.fov) } : p,
    )
    set({ panes })
    save(get())
  },
  togglePerf: () => {
    set({ perfMeter: !get().perfMeter })
    save(get())
  },
}))

/** Live numbers for the performance meter, updated a few times a second. */
export const usePerf = create<{
  fps: number
  frameMs: number
  drawCalls: number
  faces: number
  editMs: number
  memoryMb: number | null
}>(() => ({ fps: 0, frameMs: 0, drawCalls: 0, faces: 0, editMs: 0, memoryMb: null }))
