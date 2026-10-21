import { beforeEach, describe, expect, it } from 'vitest'
import { openDoc, setView, useEditor } from '@/core/editor/editorStore'
import { createProject } from '@/core/model/factories'
import { useUi } from '@/ui/uiStore'
import { followModeWithTabs, setEditMode } from './editMode'

let frontId: string

beforeEach(() => {
  const { project, templates, cards } = createProject()
  frontId = templates[0].id
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
  useUi.setState({ leftTab: 'cards' })
})

describe('tabs follow the editing mode', () => {
  it("template mode opens the current card's template; card mode goes back", () => {
    expect(setEditMode('template')).toBe(true)
    expect(useEditor.getState().view).toMatchObject({ mode: 'template', templateId: frontId })
    setEditMode('card')
    expect(useEditor.getState().view.mode).toBe('card')
  })

  it('moves the tab when the mode changes another way, but leaves Decks alone', () => {
    const stop = followModeWithTabs()
    setView({ mode: 'template', templateId: frontId })
    expect(useUi.getState().leftTab).toBe('templates')
    setView({ mode: 'card' })
    expect(useUi.getState().leftTab).toBe('cards')
    useUi.setState({ leftTab: 'decks' })
    setView({ mode: 'template', templateId: frontId })
    expect(useUi.getState().leftTab).toBe('decks')
    stop()
  })
})
