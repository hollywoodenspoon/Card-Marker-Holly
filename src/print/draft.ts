/** Draft (ink-saving) printing helpers. Pure, no DOM. */
import type { RenderNode } from '@/core/render/renderTypes'

/** Luminance grey of a #rgb / #rrggbb colour (Rec. 601 weights), as #rrggbb. */
export function toGrey(hex: string): string {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return hex
  const n = parseInt(h, 16)
  const y = Math.round(0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255))
  const g = y.toString(16).padStart(2, '0')
  return `#${g}${g}${g}`
}

const withoutArt = new WeakMap<RenderNode[], RenderNode[]>()

/** The same render tree without pictures and art boxes (cached, so caches keyed by nodes still hit). */
export function stripArt(nodes: RenderNode[]): RenderNode[] {
  let out = withoutArt.get(nodes)
  if (!out) {
    out = nodes
      .filter((n) => n.element.type !== 'image' && n.element.type !== 'imageField')
      .map((n) => (n.children ? { ...n, children: stripArt(n.children) } : n))
    withoutArt.set(nodes, out)
  }
  return out
}
