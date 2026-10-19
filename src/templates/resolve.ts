import { mergeLayers } from '@/core/model/layering'
import { fieldDefaults, ruleHolds, type FieldDefaults } from './rules'
import { decorateText } from './textDecor'
import type { RenderNode } from '@/core/render/renderTypes'
import type {
  Card,
  Element,
  Keyword,
  ImageValue,
  Side,
  StylePreset,
  Template,
  TextElement,
  TextValue,
} from '@/core/model/types'

export type ResolveMode = 'card' | 'template'

/**
 * Is a template element visible on this card? A per-card toggle wins; otherwise
 * the part's default visibility and its "show when" rule decide.
 */
export function isVisibleOnCard(
  el: Element,
  card: Card | undefined,
  defaults?: FieldDefaults,
): boolean {
  const base = el.defaultVisible && (!card || ruleHolds(el.showIf, card, defaults))
  if (el.toggleLocked || !card) return base
  return card.overrides[el.id]?.visible ?? base
}

export function textValueFor(el: Element & { type: 'text' }, card?: Card): TextValue {
  const v = card?.fields[el.fieldName]
  return v?.kind === 'text' ? v : { kind: 'text', text: el.defaultText }
}

export function countValueFor(el: Element & { type: 'iconRow' }, card?: Card): number {
  const v = card?.fields[el.fieldName]
  return v?.kind === 'count' ? v.count : el.defaultCount
}

export function greyValueFor(el: Element & { type: 'iconRow' }, card?: Card): number {
  const v = card?.fields[el.fieldName]
  return v?.kind === 'count' && v.grey !== undefined ? v.grey : (el.defaultGrey ?? 0)
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

export type Presets = Record<string, StylePreset> | undefined

/** A text element with its linked style preset applied to the base style. */
export function effectiveText(el: TextElement, presets: Presets): TextElement {
  const p = el.stylePresetId ? presets?.[el.stylePresetId] : undefined
  return p ? { ...el, baseStyle: { ...el.baseStyle, ...p.style } } : el
}

/** Extra information for resolving a card: its number in the deck, and project keywords. */
export interface ResolveContext {
  /** 1-based card number for `{#}` (Cards list position + numbering start). */
  number?: number
  /** Number of cards for `{total}`. */
  total?: number
  keywords?: Keyword[]
}

interface Env {
  card: Card | undefined
  mode: ResolveMode
  presets: Presets
  defaults: FieldDefaults
  ctx: ResolveContext
}

function resolveElements(els: Element[], source: 'template' | 'card', env: Env): RenderNode[] {
  const { card, mode, presets } = env
  const out: RenderNode[] = []
  for (const el of els) {
    // Card-local elements only use their own default visibility and rule.
    const visible =
      mode !== 'card'
        ? el.defaultVisible
        : source === 'template'
          ? isVisibleOnCard(el, card, env.defaults)
          : el.defaultVisible && ruleHolds(el.showIf, card, env.defaults)
    if (!visible && mode === 'card') continue
    const node: RenderNode = {
      element: el.type === 'text' ? effectiveText(el, presets) : el,
      source,
      dimmed: !visible,
    }
    if (el.type === 'text') node.text = decorateText(textValueFor(el, card), el, env.ctx)
    else if (el.type === 'imageField') node.image = imageValueFor(el, card)
    else if (el.type === 'iconRow') {
      node.count = countValueFor(el, card)
      node.grey = greyValueFor(el, card)
    } else if (el.type === 'group') node.children = resolveElements(el.children, source, env)
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
  presets?: Presets,
  ctx: ResolveContext = {},
): RenderNode[] {
  const defaults = fieldDefaults(template?.elements ?? [])
  const env: Env = { card, mode, presets, defaults, ctx }
  if (mode !== 'card' || !card)
    return template ? resolveElements(template.elements, 'template', env) : []
  // Card elements interleave with template parts (each sits below its anchor, or on top).
  return mergeLayers(template?.elements ?? [], card.local[side]).flatMap((l) =>
    resolveElements([l.el], l.source, env),
  )
}
