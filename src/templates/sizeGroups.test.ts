import { beforeEach, describe, expect, it } from 'vitest'
import { openDoc, setView, undo, useEditor } from '@/core/editor/editorStore'
import { createCard, createProject, createTemplate } from '@/core/model/factories'
import type { CardSize, Template } from '@/core/model/types'
import { buildPrintJob } from '@/print/job'
import { setTemplateForCards } from './bulkCommands'
import { applyTemplate, deleteTemplate, newTemplate } from './commands'
import { setFrontAnchor, setGroupSize } from './sizeCommands'
import { anchorOf, groupOf, migrateAnchors, resizeConcerns, resizeTemplate } from './sizeGroups'

const POKER: CardSize = { widthMm: 63.5, heightMm: 88.9, presetId: 'poker' }
const byId = (ts: Template[]) => Object.fromEntries(ts.map((t) => [t.id, t]))

describe('size groups', () => {
  it('groups a back with every front anchored to it', () => {
    const { project, templates } = createProject()
    const [front, back] = templates
    const spell = { ...createTemplate(project.id, 'front', front.size, 'Spell'), backId: back.id }
    const token = createTemplate(project.id, 'back', POKER, 'Token back')
    const all = byId([front, back, spell, token])
    expect(front.backId).toBe(back.id)
    expect(groupOf(all, spell.id).map((t) => t.name)).toEqual([
      'Basic front',
      'Spell',
      'Basic back',
    ])
    expect(groupOf(all, back.id)).toHaveLength(3)
    expect(groupOf(all, token.id)).toEqual([token])
    expect(anchorOf(all, spell.id)).toBe(back)
  })

  it('asks before resizing only when something was designed', () => {
    const { templates, cards } = createProject()
    const all = byId(templates)
    const cs = Object.fromEntries(cards.map((c) => [c.id, c]))
    expect(resizeConcerns(all, cs, templates[0].id)).toBeNull()
    all[templates[1].id] = { ...templates[1], edited: true }
    expect(resizeConcerns(all, cs, templates[0].id)?.edited.map((t) => t.name)).toEqual([
      'Basic back',
    ])
  })
})

describe('resizing a template', () => {
  it('stretches full-card backgrounds and keeps other parts where they are', () => {
    const { templates } = createProject()
    const t = structuredClone(templates[1])
    const before = t.elements.map((e) => ({ ...e }))
    resizeTemplate(t, POKER, 3)
    const bg = t.elements[0]
    expect([bg.xMm, bg.yMm, bg.wMm, bg.hMm]).toEqual([-3, -3, 69.5, 94.9])
    const moved = t.elements.slice(1).filter((e, i) => e.xMm !== before[i + 1].xMm)
    expect(moved).toEqual([])
    expect(t.size).toEqual(POKER)
  })
})

describe('migrating projects from before size groups', () => {
  it('anchors a front to the back its cards use most', () => {
    const { project, templates } = createProject()
    const [front, back] = templates
    const other = createTemplate(project.id, 'back', front.size, 'Other back')
    const old = { ...front, backId: undefined }
    const all = byId([old, back, other])
    const cards = [1, 2, 3].map((n) =>
      createCard(project.id, n, old.id, n === 1 ? back.id : other.id, `C${n}`),
    )
    const changed = migrateAnchors(project, all, cards)
    expect(changed.map((t) => t.id)).toEqual([old.id])
    expect(all[old.id].backId).toBe(other.id)
    expect(migrateAnchors(project, all, cards)).toEqual([])
  })

  it('makes a starter back when no back has the front size', () => {
    const { project, templates } = createProject()
    const old = { ...templates[0], backId: undefined }
    const all = byId([old])
    const changed = migrateAnchors(project, all, [])
    const back = changed.find((t) => t.side === 'back')!
    expect(back.size).toEqual(old.size)
    expect(all[old.id].backId).toBe(back.id)
  })
})

describe('size commands', () => {
  let frontId: string
  let backId: string
  let cardId: string
  let tokenFront: Template
  let tokenBack: Template

  beforeEach(() => {
    const { project, templates, cards } = createProject()
    tokenBack = createTemplate(project.id, 'back', POKER, 'Token back')
    tokenFront = { ...createTemplate(project.id, 'front', POKER, 'Token'), backId: tokenBack.id }
    frontId = templates[0].id
    backId = templates[1].id
    cardId = cards[0].id
    openDoc(
      {
        project,
        templates: byId([...templates, tokenFront, tokenBack]),
        cards: Object.fromEntries(cards.map((c) => [c.id, c])),
        stylePresets: {},
      },
      { assets: {}, fonts: {} },
      { cardId },
    )
  })

  const doc = () => useEditor.getState().doc!

  it('resizes the whole group and nothing else, in one undo step', () => {
    setGroupSize(frontId, POKER)
    expect(doc().templates[frontId].size).toEqual(POKER)
    expect(doc().templates[backId].size).toEqual(POKER)
    expect(doc().templates[tokenFront.id].size).toEqual(POKER)
    setGroupSize(tokenBack.id, { widthMm: 40, heightMm: 40, presetId: 'custom' })
    expect(doc().templates[tokenFront.id].size.widthMm).toBe(40)
    expect(doc().templates[frontId].size).toEqual(POKER)
    undo()
    expect(doc().templates[tokenFront.id].size).toEqual(POKER)
  })

  it('switches the back with the front, and only allows backs of the same size', () => {
    applyTemplate(tokenFront.id, cardId)
    expect(doc().cards[cardId].backTemplateId).toBe(tokenBack.id)
    expect(applyTemplate(backId, cardId)).toBe('size')
    expect(doc().cards[cardId].backTemplateId).toBe(tokenBack.id)
    expect(setTemplateForCards([cardId], 'back', backId)).toBe(1)
    setTemplateForCards([cardId], 'front', frontId)
    expect(doc().cards[cardId].backTemplateId).toBe(backId)
  })

  it('re-anchors a front, taking the new back size and moving its cards', () => {
    setFrontAnchor(frontId, tokenBack.id)
    expect(doc().templates[frontId].size).toEqual(POKER)
    expect(doc().cards[cardId].backTemplateId).toBe(tokenBack.id)
  })

  it('anchors a new front to the current card back', () => {
    const id = newTemplate('front')!
    expect(doc().templates[id].backId).toBe(backId)
    setView({ mode: 'card' })
  })

  it("moves a deleted back's fronts to another back", () => {
    deleteTemplate(tokenBack.id)
    const back = doc().templates[doc().templates[tokenFront.id].backId!]
    expect(back.id).toBe(backId)
  })

  it('prints each size on its own sheets', () => {
    const d = doc()
    const token = createCard(d.project.id, 5, tokenFront.id, tokenBack.id, 'Token')
    const job = buildPrintJob({
      project: d.project,
      templates: d.templates,
      cards: [...Object.values(d.cards), token],
      assets: {},
      fonts: [],
    })
    expect(job.groups.map((g) => g.card)).toEqual([
      { w: 54, h: 86 },
      { w: 63.5, h: 88.9 },
    ])
    expect(job.pages).toHaveLength(2)
    expect(job.pageGroup).toEqual([0, 1])
    expect(job.groups[0].sheet.perSheet).not.toBe(job.groups[1].sheet.perSheet)
    expect(job.copyCount).toBe(2)
  })
})
