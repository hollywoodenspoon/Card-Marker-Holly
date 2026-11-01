import { describe, expect, it } from 'vitest'
import { fillLine, textFor, tidyText } from './gameText'
import { newGame, tidyGame } from './game'
import {
  autoSlotNames,
  defaultSettings,
  hasEnded,
  isAutoSlot,
  manualSlotNames,
  tidySettings,
} from './settings'

describe('settings', () => {
  it('fills what an old game lacks and keeps numbers in range', () => {
    expect(tidySettings(undefined)).toEqual(defaultSettings())
    const s = tidySettings({ saveSlots: 500, autoSlots: -3, textSpeed: 9999 })
    expect(s.saveSlots).toBe(99)
    expect(s.autoSlots).toBe(0)
    expect(s.textSpeed).toBe(1000)
  })

  it('names the slots', () => {
    const s = { ...defaultSettings(), autoSlots: 3, saveSlots: 2 }
    expect(autoSlotNames(s)).toEqual(['auto', 'auto2', 'auto3'])
    expect(manualSlotNames(s)).toEqual(['1', '2'])
    expect(isAutoSlot('auto2')).toBe(true)
    expect(isAutoSlot('2')).toBe(false)
  })

  it('ends after the set years, or never', () => {
    const s = defaultSettings()
    expect(hasEnded(s, 48, 10_000)).toBe(false)
    const years = { ...s, ending: { ...s.ending, kind: 'years' as const, years: 2 } }
    expect(hasEnded(years, 48, 95)).toBe(false)
    expect(hasEnded(years, 48, 96)).toBe(true)
  })

  it('an old game file loads with settings, text and a league', () => {
    const raw = { ...newGame('Old') } as Partial<ReturnType<typeof newGame>> & { id: string }
    delete raw.settings
    delete raw.text
    delete raw.league
    const g = tidyGame(raw)
    expect(g.settings).toEqual(defaultSettings())
    expect(g.text).toEqual({})
    expect(g.league.enabled).toBe(false)
  })
})

describe('game text', () => {
  it('uses the game’s own wording, else the default, and fills placeholders', () => {
    expect(textFor({}, 'save.slot')).toBe('Slot {n}')
    expect(textFor({ 'save.slot': 'File {n}' }, 'save.slot')).toBe('File {n}')
    expect(textFor({ 'save.slot': '' }, 'save.slot')).toBe('Slot {n}')
    expect(fillLine('Slot {n} {x}', { n: 2 })).toBe('Slot 2 {x}')
    expect(tidyText({ a: 'x', b: 3 })).toEqual({ a: 'x' })
  })
})
