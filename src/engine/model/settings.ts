/**
 * Game settings: the rules of the game itself that aren't Cause and Effect.
 * Every value here is the game's own; the defaults are only a starting point.
 */
export interface GameSettings {
  /** Save slots the player can write to, and slots the game rotates its autosaves through. */
  saveSlots: number
  autoSlots: number
  /** Autosave when the scene changes, and when a new week starts. */
  autosaveOnScene: boolean
  autosaveOnWeek: boolean
  /** Dialogue speed in letters per second. 0: all at once. */
  textSpeed: number
  /** Whether the game shows its tutorial hints at all. */
  tutorial: boolean
  /** Shows the editor's developer tools (the season simulator…) in the editor. */
  devTools: boolean
  /** When the game ends by itself. */
  ending: { kind: 'never' | 'years'; years: number; text: string }
  /** When the world moves on (NPC matches, careers, the market). */
  worldStep: 'weekChange' | 'off'
}

export const defaultSettings = (): GameSettings => ({
  saveSlots: 3,
  autoSlots: 1,
  autosaveOnScene: true,
  autosaveOnWeek: true,
  textSpeed: 40,
  tutorial: true,
  devTools: true,
  ending: { kind: 'never', years: 7, text: 'The end.' },
  worldStep: 'weekChange',
})

const num = (v: unknown, d: number, min: number, max: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : d
  return Math.max(min, Math.min(max, Math.round(n)))
}

/** Fill anything an older game file lacks and keep numbers in range. */
export function tidySettings(raw: Partial<GameSettings> | undefined): GameSettings {
  const d = defaultSettings()
  const r = raw ?? {}
  return {
    saveSlots: num(r.saveSlots, d.saveSlots, 0, 99),
    autoSlots: num(r.autoSlots, d.autoSlots, 0, 20),
    autosaveOnScene: r.autosaveOnScene ?? d.autosaveOnScene,
    autosaveOnWeek: r.autosaveOnWeek ?? d.autosaveOnWeek,
    textSpeed: num(r.textSpeed, d.textSpeed, 0, 1000),
    tutorial: r.tutorial ?? d.tutorial,
    devTools: r.devTools ?? d.devTools,
    ending: {
      kind: r.ending?.kind === 'years' ? 'years' : 'never',
      years: num(r.ending?.years, d.ending.years, 1, 1000),
      text: typeof r.ending?.text === 'string' ? r.ending.text : d.ending.text,
    },
    worldStep: r.worldStep === 'off' ? 'off' : 'weekChange',
  }
}

/** Slot names in order: autosaves ("auto", "auto2"…) then the player's ("1", "2"…). */
export const autoSlotNames = (s: GameSettings) =>
  Array.from({ length: s.autoSlots }, (_, i) => (i === 0 ? 'auto' : `auto${i + 1}`))
export const manualSlotNames = (s: GameSettings) =>
  Array.from({ length: s.saveSlots }, (_, i) => String(i + 1))
export const isAutoSlot = (slot: string) => slot.startsWith('auto')

/** Whether the game has run out its length at this week. */
export function hasEnded(s: GameSettings, weeksPerYear: number, week: number): boolean {
  return s.ending.kind === 'years' && week >= s.ending.years * Math.max(1, weeksPerYear)
}
