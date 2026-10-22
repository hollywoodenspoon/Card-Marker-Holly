import { useSyncExternalStore } from 'react'

export type LayoutKind = 'phone' | 'tablet' | 'desktop'

const phoneQ = '(max-width: 767px)'
const desktopQ = '(min-width: 1200px)'

/** The layout right now (outside React, e.g. in an action). */
export function currentLayout(): LayoutKind {
  if (matchMedia(phoneQ).matches) return 'phone'
  if (matchMedia(desktopQ).matches) return 'desktop'
  return 'tablet'
}

function subscribe(cb: () => void) {
  const a = matchMedia(phoneQ)
  const b = matchMedia(desktopQ)
  a.addEventListener('change', cb)
  b.addEventListener('change', cb)
  return () => {
    a.removeEventListener('change', cb)
    b.removeEventListener('change', cb)
  }
}

export function useLayout(): LayoutKind {
  return useSyncExternalStore(subscribe, currentLayout)
}

/** True when the primary pointer is coarse (finger) — used for larger handles. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia('(pointer: coarse)')
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia('(pointer: coarse)').matches,
  )
}
