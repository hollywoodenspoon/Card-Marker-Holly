/**
 * Side panel widths: dragged at the panel's inner edge, saved per device under
 * "cardmaker.panel.<id>". Widths are in CSS px at 100 % UI size; the UI size setting
 * scales them on screen (see uiScale.ts).
 */
export interface PanelLimits {
  min: number
  max: number
  /** The width a double-click on the edge goes back to. */
  initial: number
}

export const clampWidth = (w: number, l: PanelLimits) =>
  Math.round(Math.min(l.max, Math.max(l.min, Number.isFinite(w) ? w : l.initial)))

const key = (id: string) => `cardmaker.panel.${id}`

export function loadWidth(id: string, l: PanelLimits): number {
  try {
    const raw = localStorage.getItem(key(id))
    return raw === null ? l.initial : clampWidth(Number(raw), l)
  } catch {
    return l.initial
  }
}

export function saveWidth(id: string, w: number | null) {
  try {
    if (w === null) localStorage.removeItem(key(id))
    else localStorage.setItem(key(id), String(Math.round(w)))
  } catch {
    // Private windows and blocked storage: the width just isn't remembered.
  }
}

/**
 * The width while dragging: the start width plus how far the pointer moved, inward or
 * outward depending on the panel's side, in unscaled px.
 */
export function dragWidth(
  start: number,
  dxScreen: number,
  side: 'left' | 'right',
  scale: number,
  l: PanelLimits,
) {
  const dx = dxScreen / (scale || 1)
  return clampWidth(start + (side === 'left' ? dx : -dx), l)
}
