import { mergeLayers } from '@/core/model/layering'
import type { RenderNode } from '@/core/render/renderTypes'
import type { Card, Element, ImageValue, Side, Template, TextValue } from '@/core/model/types'

export type ResolveMode = 'card' | 'template'

/** Is a template element visible on this card? */
export function isVisibleOnCard(el: Element, card: Card | undefined): boolean {
  if (el.toggleLocked || !card) return el.defaultVisible
  return card.overrides[el.id]?.visible ?? el.defaultVisible
}

export function textValueFor(el: Element & { type: 'text' }, card?: Card): TextValue {
  const v = card?.fields[el.fieldName]
  return v?.kind === 'text' ? v : { kind: 'text', text: el.defaultText }
}

export function imageValueFor(el: Element & { type: 'imageField' }, card?: Card): ImageValue {
  const v = card?.fields[el.fieldName]
  if (v?.kind === 'image') return { ...v, fit: v.fit ?? el.fit }
  return {
    kind: 'image',
    assetId: el.defaultAssetId,
    fit: el.fit,
    offsetXMm: 0,
    offsetYMm: 0,
    zoom: 1,
  }
}

function resolveElements(
  els: Element[],
  source: 'template' | 'card',
  card: Card | undefined,
  mode: ResolveMode,
): RenderNode[] {
  const out: RenderNode[] = []
  for (const el of els) {
    // Card-local elements only use their own default visibility.
    const visible =
      source === 'template' && mode === 'card' ? isVisibleOnCard(el, card) : el.defaultVisible
    if (!visible && mode === 'card') continue
    const node: RenderNode = { element: el, source, dimmed: !visible }
    if (el.type === 'text') node.text = textValueFor(el, card)
    else if (el.type === 'imageField') node.image = imageValueFor(el, card)
    else if (el.type === 'group') node.children = resolveElements(el.children, source, card, mode)
    out.push(node)
  }
  return out
}

/**
 * Turn a template + a card into the tree of things to draw.
 * Geometry always comes from the template, so hiding a part never moves the others.
 *
 * - card mode: per-card visibility overrides apply; hidden parts are dropped;
 *   the card's own elements are interleaved by their `zBelow` anchor (default on top).
 * - template mode: default visibility; hidden parts are kept but dimmed;
 *   the card (if any) only supplies preview values for fields.
 */
export function resolveSide(
  template: Template | undefined,
  card: Card | undefined,
  side: Side,
  mode: ResolveMode,
): RenderNode[] {
  if (mode !== 'card' || !card)
    return template ? resolveElements(template.elements, 'template', card, mode) : []
  // Card elements interleave with template parts (each sits below its anchor, or on top).
  return mergeLayers(template?.elements ?? [], card.local[side]).flatMap((l) =>
    resolveElements([l.el], l.source, card, mode),
  )
}
