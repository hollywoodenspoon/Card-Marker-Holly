import { describe, expect, it } from 'vitest'
import { createCard, createProject } from '@/core/model/factories'
import type { Card } from '@/core/model/types'
import { buildPrintJob } from './job'
import { movedOrder, printEntries, printSlots } from './printList'

const card = (id: string, order: number): Card => ({
  ...createCard('p', order, null, null, id),
  id,
})
const cards = [card('c', 3), card('a', 1), card('b', 2)]
const names = (es: { card: Card }[]) => es.map((e) => e.card.id)

describe('print list', () => {
  it('follows the Cards list with one copy each by default', () => {
    const es = printEntries(cards, {})
    expect(names(es)).toEqual(['a', 'b', 'c'])
    expect(es.map((e) => e.copies)).toEqual([1, 1, 1])
  })

  it('uses a custom order, appends new cards and ignores deleted ones', () => {
    const es = printEntries(cards, { order: ['c', 'gone', 'a', 'c'] })
    expect(names(es)).toEqual(['c', 'a', 'b'])
  })

  it('repeats copies next to each other and skips cards set to 0', () => {
    const es = printEntries(cards, { copies: { a: 3, b: 0 } })
    expect(printSlots(es)).toEqual([0, 0, 0, 2])
  })

  it('moves a card within the print order', () => {
    expect(movedOrder(printEntries(cards, {}), 2, 0)).toEqual(['c', 'a', 'b'])
    expect(movedOrder(printEntries(cards, {}), 0, 2)).toEqual(['b', 'c', 'a'])
  })
})

describe('print job pages', () => {
  it('fills sheets with copies in print order', () => {
    const { project, templates } = createProject()
    const t = Object.fromEntries(templates.map((x) => [x.id, x]))
    const cs = ['A', 'B', 'C'].map((n, i) => ({
      ...createCard(project.id, i, templates[0].id, templates[1].id, n),
      id: n,
    }))
    project.print = { ...project.print, copies: { A: 6, B: 0, C: 4 }, order: ['C', 'A'] }
    const job = buildPrintJob({ project, templates: t, cards: cs, assets: {}, fonts: [] })
    expect(job.sheet.perSheet).toBe(9)
    expect(job.cards.map((c) => c.card.id)).toEqual(['C', 'A'])
    expect(job.copyCount).toBe(10)
    expect(job.pages).toEqual([[0, 0, 0, 0, 1, 1, 1, 1, 1], [1]])
  })
})

describe('which sheets print', () => {
  const { project, templates } = createProject()
  const t = Object.fromEntries(templates.map((x) => [x.id, x]))
  const withBack = { ...createCard(project.id, 0, templates[0].id, templates[1].id, 'A'), id: 'A' }
  const noBack = { ...createCard(project.id, 1, templates[0].id, null, 'B'), id: 'B' }
  const job = (print: object, cs = [withBack, noBack]) =>
    buildPrintJob({
      project: { ...project, print: { ...project.print, ...print } },
      templates: t,
      cards: cs,
      assets: {},
      fonts: [],
    })

  it('prints fronts and backs, fronts only, or backs only', () => {
    expect(job({}).sides).toEqual({ fronts: true, backs: true })
    expect(job({ sheets: 'fronts' }).sides).toEqual({ fronts: true, backs: false })
    expect(job({ sheets: 'backs' }).sides).toEqual({ fronts: false, backs: true })
  })

  it('keeps an older project that had backs switched off on fronts only', () => {
    expect(job({ includeBacks: false }).sides).toEqual({ fronts: true, backs: false })
  })

  it('has nothing to print for backs only when no card has a back', () => {
    expect(job({ sheets: 'backs' }, [noBack]).sides).toEqual({ fronts: false, backs: false })
  })
})
