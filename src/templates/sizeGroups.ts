import { createTemplate, starterBackElements } from '@/core/model/factories'
import type { Card, CardSize, Id, Project, Template } from '@/core/model/types'

/**
 * Size groups. Every front is anchored to a back (`Template.backId`); a back
 * and all fronts anchored to it share one size, so a front always lines up
 * with its back when printed double-sided. Different groups can have
 * different sizes.
 */

type Templates = Record<Id, Template>

const byAge = (a: Template, b: Template) => a.createdAt - b.createdAt

/** The back a template prints with: a front's anchor, or a back itself. */
export function anchorOf(templates: Templates, id: Id | null | undefined): Template | undefined {
  const t = id ? templates[id] : undefined
  if (!t) return undefined
  return t.side === 'back' ? t : t.backId ? templates[t.backId] : undefined
}

/** The templates that share a size with this one (always includes it), oldest first. */
export function groupOf(templates: Templates, id: Id): Template[] {
  const t = templates[id]
  if (!t) return []
  const back = anchorOf(templates, id)
  if (!back) return [t]
  const fronts = Object.values(templates).filter((x) => x.side === 'front' && x.backId === back.id)
  return [...fronts.sort(byAge), back]
}

/** Card ids that use any template of the group. */
export function cardsOfGroup(cards: Record<Id, Card>, group: Template[]): Card[] {
  const ids = new Set(group.map((t) => t.id))
  return Object.values(cards).filter(
    (c) =>
      (c.frontTemplateId && ids.has(c.frontTemplateId)) ||
      (c.backTemplateId && ids.has(c.backTemplateId)),
  )
}

export const sameSize = (a: CardSize, b: CardSize) =>
  Math.abs(a.widthMm - b.widthMm) < 0.001 && Math.abs(a.heightMm - b.heightMm) < 0.001

/**
 * Why resizing this group should ask first, or null when nothing would be
 * affected (only untouched starter templates and cards without own layers).
 */
export function resizeConcerns(
  templates: Templates,
  cards: Record<Id, Card>,
  id: Id,
): { edited: Template[]; cardsWithLayers: Card[] } | null {
  const group = groupOf(templates, id)
  const edited = group.filter((t) => t.edited)
  const cardsWithLayers = cardsOfGroup(cards, group).filter(
    (c) => c.local.front.length > 0 || c.local.back.length > 0,
  )
  return edited.length || cardsWithLayers.length ? { edited, cardsWithLayers } : null
}

/** The back a card should use with this front: the front's anchor, else its current back. */
export function backForFront(templates: Templates, frontId: Id | null, current: Id | null) {
  return anchorOf(templates, frontId)?.id ?? current
}

/** A starter back at this size (for a front with no back of its size). */
export function starterBack(project: Project, size: CardSize, name = 'Basic back'): Template {
  return createTemplate(
    project.id,
    'back',
    { ...size },
    name,
    starterBackElements(size, project.bleedMm),
  )
}

/**
 * The back a new or unanchored front should use: `preferred` (or the most
 * common back on its cards) when it has the same size, else the oldest back of
 * its size, else a new starter back (returned as `created`).
 */
export function pickAnchor(
  project: Project,
  templates: Templates,
  front: Template,
  preferred: Id[] = [],
): { back: Template; created?: Template } {
  const backs = Object.values(templates)
    .filter((t) => t.side === 'back')
    .sort(byAge)
  const fits = (b: Template | undefined): b is Template =>
    !!b && b.side === 'back' && sameSize(b.size, front.size)
  const back = preferred.map((id) => templates[id]).find(fits) ?? backs.find(fits)
  if (back) return { back }
  const created = starterBack(project, front.size, `${front.name} back`)
  return { back: created, created }
}

/**
 * Projects from before size groups: anchor every front to a back. A front
 * gets the back most of its cards use, else the oldest back, as long as it
 * has the front's size; otherwise a starter back is made at the front's size.
 * Mutates `templates` and returns the templates that changed or were added
 * (empty when nothing needed doing).
 */
export function migrateAnchors(project: Project, templates: Templates, cards: Card[]): Template[] {
  const fronts = Object.values(templates)
    .filter((t) => t.side === 'front' && !(t.backId && templates[t.backId]))
    .sort(byAge)
  const changed: Template[] = []
  for (const f of fronts) {
    const counts = new Map<Id, number>()
    for (const c of cards)
      if (c.frontTemplateId === f.id && c.backTemplateId)
        counts.set(c.backTemplateId, (counts.get(c.backTemplateId) ?? 0) + 1)
    const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
    const { back, created } = pickAnchor(project, templates, f, used)
    if (created) {
      templates[created.id] = created
      changed.push(created)
    }
    templates[f.id] = { ...f, backId: back.id }
    changed.push(templates[f.id])
  }
  return changed
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.01

/**
 * Give a template a new size. Parts keep their mm positions, except top-level
 * parts that exactly cover the card or the card plus bleed (a background):
 * those are stretched to keep covering it. Works on an immer draft or a copy.
 */
export function resizeTemplate(t: Template, size: CardSize, bleedMm: number) {
  const { widthMm: w, heightMm: h } = t.size
  for (const el of t.elements) {
    if (el.type === 'group' || el.rotation) continue
    for (const b of [0, bleedMm]) {
      if (
        near(el.xMm, -b) &&
        near(el.yMm, -b) &&
        near(el.wMm, w + 2 * b) &&
        near(el.hMm, h + 2 * b)
      ) {
        el.wMm = size.widthMm + 2 * b
        el.hMm = size.heightMm + 2 * b
        break
      }
    }
  }
  t.size = { ...size }
}
