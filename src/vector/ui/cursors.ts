/**
 * Pen cursors like Illustrator's: a pen nib with its tip on the hotspot and a
 * small badge saying what a click will do. Built as SVG data URLs.
 */
import type { PenIntent } from '../pen'

export type CursorBadge =
  'new' | 'none' | 'close' | 'continue' | 'join' | 'add' | 'delete' | 'convert'

const BADGES: Record<CursorBadge, string> = {
  none: '',
  // asterisk: start a new path
  new: '<path d="M24 18v10M19.7 20.5l8.6 5M19.7 25.5l8.6-5"/>',
  close: '<circle cx="24" cy="23" r="3.6"/>',
  continue: '<path d="M21 28l6-10"/>',
  join: '<path d="M18.5 23h4"/><circle cx="25.5" cy="23" r="2.6"/>',
  add: '<path d="M24 18.5v9M19.5 23h9"/>',
  delete: '<path d="M19.5 23h9"/>',
  convert: '<path d="M19.5 26l4.5-6 4.5 6"/>',
}

// Pen nib pointing to the top-left corner (the hotspot at 2,2).
const NIB =
  '<g transform="translate(2 2) rotate(-45)"><path d="M0 0 L5.2 9 L4.2 13.5 H-4.2 L-5.2 9 Z"/><path d="M0 1.5 V7.2"/><circle cx="0" cy="7.8" r="1.1"/><path d="M-4 15.5 H4 V19 H-4 Z"/></g>'

function draw(body: string, fill: boolean) {
  // White first (thick), then black, so the cursor shows on any colour.
  const layer = (stroke: string, width: number) =>
    `<g fill="${fill ? stroke : 'none'}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`
  return layer('#ffffff', 3) + layer('#111111', 1.3)
}

const cache = new Map<string, string>()

export function penCursor(badge: CursorBadge): string {
  const hit = cache.get(badge)
  if (hit) return hit
  const nib = `<g>${draw(NIB, false)}</g>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${nib}${draw(BADGES[badge], false)}</svg>`
  const css = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 2 2, crosshair`
  cache.set(badge, css)
  return css
}

export function badgeFor(intent: PenIntent): CursorBadge {
  switch (intent.kind) {
    case 'new':
      return 'new'
    case 'place':
      return 'none'
    case 'close':
      return 'close'
    case 'convertLast':
    case 'convert':
      return 'convert'
    case 'join':
      return 'join'
    case 'continue':
      return 'continue'
    case 'add':
      return 'add'
    case 'delete':
      return 'delete'
  }
}
