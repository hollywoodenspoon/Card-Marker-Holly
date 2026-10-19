import type { CardSize, Orientation } from '../model/types'

export interface SizePreset {
  id: string
  label: string
  /** Portrait dimensions (width <= height); new projects start portrait. */
  widthMm: number
  heightMm: number
  note?: string
  group: PresetGroup
}

export type PresetGroup = 'Card games' | 'Board games' | 'Other'
export const PRESET_GROUPS: PresetGroup[] = ['Card games', 'Board games', 'Other']

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'id', label: 'ID card', widthMm: 54, heightMm: 86, note: 'Default', group: 'Card games' },
  {
    id: 'poker',
    label: 'Poker',
    widthMm: 63.5,
    heightMm: 88.9,
    note: '2.5 × 3.5 in',
    group: 'Card games',
  },
  { id: 'tcg', label: 'Trading card', widthMm: 63, heightMm: 88, group: 'Card games' },
  {
    id: 'japanese',
    label: 'Japanese TCG',
    widthMm: 59,
    heightMm: 86,
    note: 'Yu-Gi-Oh!, Cardfight!! Vanguard',
    group: 'Card games',
  },
  {
    id: 'bridge',
    label: 'Bridge',
    widthMm: 57,
    heightMm: 89,
    note: '2.25 × 3.5 in',
    group: 'Card games',
  },
  { id: 'mini-american', label: 'Mini American', widthMm: 41, heightMm: 63, group: 'Board games' },
  { id: 'mini-euro', label: 'Mini Euro', widthMm: 44, heightMm: 68, group: 'Board games' },
  { id: 'american', label: 'American', widthMm: 56, heightMm: 87, group: 'Board games' },
  { id: 'euro', label: 'Euro', widthMm: 59, heightMm: 92, group: 'Board games' },
  { id: 'tarot', label: 'Tarot', widthMm: 70, heightMm: 120, group: 'Board games' },
  { id: 'square-small', label: 'Square small', widthMm: 70, heightMm: 70, group: 'Board games' },
  { id: 'square-large', label: 'Square large', widthMm: 80, heightMm: 80, group: 'Board games' },
  { id: 'dixit', label: 'Dixit', widthMm: 80, heightMm: 120, group: 'Board games' },
  { id: 'business-eu', label: 'Business card (EU)', widthMm: 55, heightMm: 85, group: 'Other' },
  {
    id: 'business-us',
    label: 'Business card (US)',
    widthMm: 50.8,
    heightMm: 88.9,
    note: '2 × 3.5 in',
    group: 'Other',
  },
]

export const DEFAULT_PRESET_ID = 'id'

export function presetSize(id: string): CardSize {
  const p = SIZE_PRESETS.find((s) => s.id === id) ?? SIZE_PRESETS[0]
  return { presetId: p.id, widthMm: p.widthMm, heightMm: p.heightMm }
}

export const orientationOf = (s: { widthMm: number; heightMm: number }): Orientation =>
  s.widthMm > s.heightMm ? 'landscape' : 'portrait'

export function withOrientation(s: CardSize, o: Orientation): CardSize {
  if (orientationOf(s) === o || s.widthMm === s.heightMm) return s
  return { ...s, widthMm: s.heightMm, heightMm: s.widthMm }
}

/** The preset matching these dimensions in either orientation, or 'custom'. */
export function matchPreset(widthMm: number, heightMm: number): string {
  const p = SIZE_PRESETS.find(
    (s) =>
      (s.widthMm === widthMm && s.heightMm === heightMm) ||
      (s.widthMm === heightMm && s.heightMm === widthMm),
  )
  return p ? p.id : 'custom'
}
