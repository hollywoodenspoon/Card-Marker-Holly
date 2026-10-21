import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import themeData from './themes.json'

/** A colour theme on top of light or dark (CSS `[data-theme]`, made from themes.json). */
export interface ColourTheme {
  id: string
  label: string
  group: string
  dark: boolean
  swatch: string[]
}

export const THEMES: ColourTheme[] = themeData.map(({ id, label, group, dark, swatch }) => ({
  id,
  label,
  group,
  dark,
  swatch,
}))

/** Groups in the order the theme picker shows them. */
export const THEME_GROUPS = [
  'Hearth',
  'Jobs',
  'Fun',
  'Tabletop',
  'Pastels',
  'Bold darks',
  'Accessible',
] as const

export type ThemeSetting = 'light' | 'dark' | 'system' | (string & {})
/** New users start in the Hearthside theme. */
export const DEFAULT_THEME: ThemeSetting = 'hearthside'

const colour = (t: ThemeSetting) => THEMES.find((f) => f.id === t)
const KEY = 'cardmaker.theme'
/** Remembered with the theme so public/theme-init.js can paint the right mode before React loads. */
const DARK_KEY = 'cardmaker.themeDark'
const listeners = new Set<() => void>()

const known = (v: string | null): v is ThemeSetting =>
  v === 'light' || v === 'dark' || v === 'system' || !!colour(v ?? '')

function read(): ThemeSetting {
  try {
    const v = localStorage.getItem(KEY)
    if (known(v)) return v
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_THEME
}

let current: ThemeSetting = typeof window === 'undefined' ? DEFAULT_THEME : read()
const media = typeof window === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)')

const isDark = () =>
  colour(current)?.dark ?? (current === 'dark' || (current === 'system' && !!media?.matches))

function apply() {
  const root = document.documentElement
  root.classList.toggle('dark', isDark())
  if (colour(current)) root.dataset.theme = current
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
    localStorage.setItem(DARK_KEY, colour(t) ? (colour(t)!.dark ? '1' : '0') : '')
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

/** The theme picker dialog (src/ui/theme/ThemeMenu.tsx). */
export const useThemeDialog = create<{ open: boolean }>(() => ({ open: false }))
export const openThemePicker = () => useThemeDialog.setState({ open: true })
