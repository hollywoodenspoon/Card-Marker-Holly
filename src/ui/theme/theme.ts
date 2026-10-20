import { useSyncExternalStore } from 'react'

/** Colour themes on top of light or dark (CSS `[data-theme]` in index.css). */
export const FUN_THEMES = [
  {
    id: 'bubblegum',
    label: 'Bubblegum pop',
    dark: false,
    swatch: ['#ff69b4', '#069494', '#00f0ff'],
  },
  { id: 'arcade', label: 'Midnight arcade', dark: true, swatch: ['#39ff9c', '#ff3df2', '#1b1236'] },
  { id: 'forest', label: 'Forest', dark: false, swatch: ['#2f6b3a', '#c88a2c', '#f4f1e8'] },
  { id: 'sunset', label: 'Sunset', dark: false, swatch: ['#e8505b', '#f9a23c', '#fff6ef'] },
] as const
type FunTheme = (typeof FUN_THEMES)[number]['id']
export type ThemeSetting = 'light' | 'dark' | 'system' | FunTheme
const fun = (t: ThemeSetting) => FUN_THEMES.find((f) => f.id === t)
const KEY = 'cardmaker.theme'
const listeners = new Set<() => void>()

function read(): ThemeSetting {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system' || fun(v as ThemeSetting))
      return v as ThemeSetting
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

let current: ThemeSetting = typeof window === 'undefined' ? 'system' : read()
const media = typeof window === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)')

const isDark = () =>
  fun(current)?.dark ?? (current === 'dark' || (current === 'system' && !!media?.matches))

function apply() {
  const root = document.documentElement
  root.classList.toggle('dark', isDark())
  if (fun(current)) root.dataset.theme = current
  else delete root.dataset.theme
}

media?.addEventListener('change', () => {
  if (current === 'system') apply()
  listeners.forEach((l) => l())
})

export function setTheme(t: ThemeSetting) {
  current = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* ignore */
  }
  apply()
  listeners.forEach((l) => l())
}

export function initTheme() {
  apply()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useThemeSetting(): ThemeSetting {
  return useSyncExternalStore(subscribe, () => current)
}

/** Whether the dark theme is currently applied. */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, isDark)
}

/** Whether dark is applied now, and a way to hear about changes (outside React). */
export const isDarkTheme = isDark
export const onThemeChange = subscribe
