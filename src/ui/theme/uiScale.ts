/**
 * UI size: one setting that scales the whole interface (text, buttons, panels), saved
 * per device under "cardmaker.uiScale". It sets the root font size, so everything
 * sized in rem follows, and "--ui-scale" for the few px sizes (side panel widths).
 * Canvases keep their own zoom. public/theme-init.js applies it before first paint.
 */
import { useSyncExternalStore } from 'react'

export const UI_SCALES = [0.9, 1, 1.1, 1.25, 1.5] as const
const KEY = 'cardmaker.uiScale'

export const clampScale = (v: number) =>
  UI_SCALES.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), 1 as number)

let scale = 1
const listeners = new Set<() => void>()

function apply(s: number) {
  const root = document.documentElement
  root.style.fontSize = s === 1 ? '' : `${16 * s}px`
  root.style.setProperty('--ui-scale', String(s))
}

export function initUiScale() {
  try {
    const raw = localStorage.getItem(KEY)
    scale = raw === null ? 1 : clampScale(Number(raw))
  } catch {
    scale = 1
  }
  apply(scale)
}

export const getUiScale = () => scale

export function setUiScale(v: number) {
  scale = clampScale(v)
  apply(scale)
  try {
    localStorage.setItem(KEY, String(scale))
  } catch {
    // Private windows: the size just isn't remembered.
  }
  listeners.forEach((l) => l())
}

export function useUiScale() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => scale,
  )
}
