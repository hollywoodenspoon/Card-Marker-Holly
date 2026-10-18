import type { Element } from './types'

export interface Layer {
  el: Element
  source: 'template' | 'card'
}

/**
 * Template parts and card-only elements in one bottom-to-top drawing order.
 * A card element sits directly below the template element named by its
 * `zBelow`; without one (or if that part no longer exists) it goes on top.
 * Card elements sharing an anchor keep their array order.
 */
export function mergeLayers(templateEls: Element[], locals: Element[]): Layer[] {
  const ids = new Set(templateEls.map((e) => e.id))
  const out: Layer[] = []
  for (const t of templateEls) {
    for (const l of locals) if (l.zBelow === t.id) out.push({ el: l, source: 'card' })
    out.push({ el: t, source: 'template' })
  }
  for (const l of locals) if (!l.zBelow || !ids.has(l.zBelow)) out.push({ el: l, source: 'card' })
  return out
}

/**
 * Move card element `id` to `index` in the merged order (counted without the
 * element itself, bottom = 0). Updates its anchor and returns the card
 * elements in their new array order.
 */
export function placeLocal(
  locals: Element[],
  templateEls: Element[],
  id: string,
  index: number,
): Element[] {
  const el = locals.find((e) => e.id === id)
  if (!el) return locals
  const rest = mergeLayers(
    templateEls,
    locals.filter((e) => e.id !== id),
  )
  const i = Math.max(0, Math.min(rest.length, index))
  rest.splice(i, 0, { el, source: 'card' })
  const above = rest.slice(i + 1).find((l) => l.source === 'template')
  if (above) el.zBelow = above.el.id
  else delete el.zBelow
  return rest.filter((l) => l.source === 'card').map((l) => l.el)
}

export type StepDir = 'forward' | 'backward' | 'front' | 'back'

/** Arrange a card element through the merged order (it can pass template parts). */
export function stepLocal(
  locals: Element[],
  templateEls: Element[],
  id: string,
  dir: StepDir,
): Element[] {
  const merged = mergeLayers(templateEls, locals)
  const i = merged.findIndex((l) => l.el.id === id)
  if (i < 0) return locals
  const last = merged.length - 1
  const to =
    dir === 'forward'
      ? Math.min(last, i + 1)
      : dir === 'backward'
        ? Math.max(0, i - 1)
        : dir === 'front'
          ? last
          : 0
  return placeLocal(locals, templateEls, id, to)
}
