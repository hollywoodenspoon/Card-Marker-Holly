import { beforeEach, describe, expect, it } from 'vitest'
import { openDoc, setView, useEditor } from '@/core/editor/editorStore'
import { createProject } from '@/core/model/factories'
import { richTextFromPlain } from '@/core/text/richtext'
import { setTextContent, showsStarterText } from './fieldCommands'

let titleId: string

beforeEach(() => {
  const { project, templates, cards } = createProject()
  titleId = templates[0].elements.find((e) => e.type === 'text')!.id
  openDoc(
    {
      project,
      templates: Object.fromEntries(templates.map((t) => [t.id, t])),
      cards: Object.fromEntries(cards.map((c) => [c.id, c])),
      stylePresets: {},
    },
    { assets: {}, fonts: {} },
    { cardId: cards[0].id },
  )
})

describe('starter text', () => {
  it("is what a new card's text field shows, until the card gets its own text", () => {
    expect(showsStarterText(titleId)).toBe(true)
    setTextContent(titleId, richTextFromPlain('Ember Drake'))
    expect(showsStarterText(titleId)).toBe(false)
  })

  it("isn't starter text in Template mode: there it is the design", () => {
    const tid = Object.keys(useEditor.getState().doc!.templates)[0]
    setView({ mode: 'template', templateId: tid })
    expect(showsStarterText(titleId)).toBe(false)
  })
})
