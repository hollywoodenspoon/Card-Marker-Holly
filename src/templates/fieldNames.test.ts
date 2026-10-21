import { beforeEach, describe, expect, it } from 'vitest'
import { commit, openDoc, setView, undo, useEditor } from '@/core/editor/editorStore'
import { createProject, createText } from '@/core/model/factories'
import { findElement } from '@/core/model/tree'
import { richTextFromPlain } from '@/core/text/richtext'
import { renameElement, renameField } from './commands'

let frontId: string
let titleId: string
let cardId: string

beforeEach(() => {
  const { project, templates, cards } = createProject()
  frontId = templates[0].id
  titleId = templates[0].elements.find((e) => e.name === 'Title')!.id
  cardId = cards[0].id
  cards[0].fields.Title = { kind: 'text', text: richTextFromPlain('Crimson Duelist') }
  openDoc(
    {
      project,
      templates: Object.fromEntries(templates.map((t) => [t.id, t])),
      cards: { [cardId]: cards[0] },
      stylePresets: {},
    },
    { assets: {}, fonts: {} },
    { cardId },
  )
  setView({ mode: 'template', templateId: frontId, side: 'front', selection: [] })
})

const doc = () => useEditor.getState().doc!
const title = () =>
  findElement(doc().templates[frontId].elements, titleId) as { name: string; fieldName: string }

describe('field and layer names stay the same', () => {
  it('renaming the field renames the layer, and card values follow', () => {
    renameField(titleId, 'Name_AS')
    expect(title()).toMatchObject({ name: 'Name_AS', fieldName: 'Name_AS' })
    expect(doc().cards[cardId].fields.Name_AS).toBeDefined()
    expect(doc().cards[cardId].fields.Title).toBeUndefined()
    undo()
    expect(title()).toMatchObject({ name: 'Title', fieldName: 'Title' })
    expect(doc().cards[cardId].fields.Title).toBeDefined()
  })

  it('renaming the layer renames the field', () => {
    renameElement(titleId, 'A_AS')
    expect(title()).toMatchObject({ name: 'A_AS', fieldName: 'A_AS' })
    expect(doc().cards[cardId].fields.A_AS).toBeDefined()
  })

  it('a layer that differed from its field gets the same name on the next rename', () => {
    commit((d) => {
      const e = findElement(d.templates[frontId].elements, titleId)!
      e.name = 'Big title'
    })
    renameField(titleId, 'Title_AS')
    expect(title()).toMatchObject({ name: 'Title_AS', fieldName: 'Title_AS' })
  })

  it('keeps the old value when another part still uses the old field name', () => {
    const twin = createText(
      { xMm: 0, yMm: 0, wMm: 10, hMm: 5 },
      { name: 'Title', fieldName: 'Title' },
    )
    commit((d) => void d.templates[frontId].elements.push(twin))
    renameField(titleId, 'Name_AS')
    const f = doc().cards[cardId].fields
    expect(f.Name_AS).toBeDefined()
    expect(f.Title).toBeDefined()
  })

  it('other parts are renamed as before', () => {
    const shape = doc().templates[frontId].elements.find((e) => e.type === 'shape')!
    renameElement(shape.id, 'Frame')
    expect(findElement(doc().templates[frontId].elements, shape.id)!.name).toBe('Frame')
  })
})
