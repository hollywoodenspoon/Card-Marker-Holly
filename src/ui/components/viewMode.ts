/**
 * File-explorer view modes for lists of things (cards, assets): large list, small
 * list, grid of thumbnails, and details (a table with sortable columns). Each panel
 * remembers its mode on this device under "cardmaker.view.<panel>".
 */
export type ViewMode = 'large' | 'small' | 'grid' | 'details'
export const VIEW_MODES: ViewMode[] = ['large', 'small', 'grid', 'details']

export const isViewMode = (v: unknown): v is ViewMode =>
  typeof v === 'string' && (VIEW_MODES as string[]).includes(v)

export function loadViewMode(panel: string, fallback: ViewMode): ViewMode {
  try {
    const v = localStorage.getItem(`cardmaker.view.${panel}`)
    return isViewMode(v) ? v : fallback
  } catch {
    return fallback
  }
}

export function saveViewMode(panel: string, mode: ViewMode) {
  try {
    localStorage.setItem(`cardmaker.view.${panel}`, mode)
  } catch {
    // Private windows: the mode just isn't remembered.
  }
}

export interface SortState<K extends string> {
  key: K
  dir: 1 | -1
}

/** Details view: click a column to sort by it, click again to reverse. */
export const nextSort = <K extends string>(s: SortState<K>, key: K): SortState<K> =>
  s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }

/** Sorts rows for display only (the stored order never changes). */
export function sortRows<T, K extends string>(
  rows: T[],
  s: SortState<K>,
  value: (row: T, key: K) => string | number,
): T[] {
  return [...rows].sort((a, b) => {
    const x = value(a, s.key)
    const y = value(b, s.key)
    const c =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })
    return c * s.dir
  })
}
