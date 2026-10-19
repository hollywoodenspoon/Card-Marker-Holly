import { describe, expect, it } from 'vitest'
import { TTS_MAX_PX, ttsCardPx, ttsSheets, ttsSlotPos } from './ttsLayout'

describe('Tabletop Simulator sheets', () => {
  it('sizes cards so a 10 × 7 sheet stays within 4096 px', () => {
    const px = ttsCardPx({ w: 54, h: 86 })
    expect(px.w * 10).toBeLessThanOrEqual(TTS_MAX_PX)
    expect(px.h * 7).toBeLessThanOrEqual(TTS_MAX_PX)
    expect(px.h).toBe(585) // height limits a portrait card
    expect(px.w / px.h).toBeCloseTo(54 / 86, 2)
  })

  it('puts 69 cards per sheet, keeping the last slot for the hidden face', () => {
    const slots = Array.from({ length: 150 }, (_, i) => i)
    expect(ttsSheets(slots).map((s) => s.length)).toEqual([69, 69, 12])
    expect(ttsSlotPos(69, { w: 10, h: 20 })).toEqual({ x: 90, y: 120 })
    expect(ttsSlotPos(11, { w: 10, h: 20 })).toEqual({ x: 10, y: 20 })
  })
})
