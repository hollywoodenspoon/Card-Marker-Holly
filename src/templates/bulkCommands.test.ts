import { beforeEach, describe, expect, it } from 'vitest'
import { openDoc, undo, useEditor } from '@/core/editor/editorStore'
import { createCard, createProject, createTemplate } from '@/core/model/factories'
import type { Card } from '@/core/model/types'
import { deleteCards, duplicateCards, setPartOnCards, setTemplateForCards } from './bulkCommands'

let ids: string[]
let frontId: string
let artId: string
let otherId: string

beforeEach(() => {
  const { project, templates, cards } = createProject()
  const other = createTemplate(project.id, 'front', project.defaultSize, 'Spell', [])
  const extra = [2, 3].map((n) =>
    createCard(project.id, n, templates[0].id, templates[1].id, `Card ${n}`),
  )
  const all: Card[] = [...cards, ...extra]
  ids = all.map((c) => c.id)
  frontId = templates[0].id
  otherId = other.id
  artId = templates[0].elements.find((e) => e.name === 'Art')!.id
  openDoc(
    {
      project,
      templates: Object.fromEntries([...templates, other].map((t) => [t.id, t])),
      cards: Object.fromEntries(all.map((c) => [c.id, c])),
      stylePresets: {},
    },
    { assets: {}, fonts: {} },
    { cardId: ids[0] },
  )
})

const cards = () => useEditor.getState().doc!.cards

describe('bulk card edits', () => {
  it('switches the template of several cards in one undo step', () => {
    setTemplateForCards(ids.slice(0, 2), 'front', otherId)
    expect(ids.map((id) => cards()[id].frontTemplateId)).toEqual([otherId, otherId, frontId])
    undo()
    expect(ids.every((id) => cards()[id].frontTemplateId === frontId)).toBe(true)
  })

  it('hides a part only on cards whose template has it', () => {
    setTemplateForCards([ids[2]], 'front', otherId)
    expect(setPartOnCards(ids, 'front', artId, false)).toBe(2)
    expect(cards()[ids[0]].overrides[artId]).toEqual({ visible: false })
    expect(cards()[ids[2]].overrides[artId]).toBeUndefined()
    setPartOnCards(ids, 'front', artId, true)
    expect(cards()[ids[0]].overrides[artId]).toBeUndefined()
  })

  it('duplicates in list order after the last chosen card, and deletes', () => {
    const copies = duplicateCards([ids[0], ids[1]])!
    const sorted = Object.values(cards()).sort((a, b) => a.order - b.order)
    expect(sorted.map((c) => c.name)).toEqual([
      'Card 1',
      'Card 2',
      'Card 1 copy',
      'Card 2 copy',
      'Card 3',
    ])
    deleteCards(copies)
    expect(Object.keys(cards())).toHaveLength(3)
  })
})
