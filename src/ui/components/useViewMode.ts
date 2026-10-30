import { useState } from 'react'
import { loadViewMode, saveViewMode, type ViewMode } from './viewMode'

/** A panel's view mode, remembered on this device. */
export function useViewMode(panel: string, fallback: ViewMode): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState(() => loadViewMode(panel, fallback))
  return [
    mode,
    (m) => {
      setMode(m)
      saveViewMode(panel, m)
    },
  ]
}
