import { describe, expect, it } from 'vitest'
import { newStage, type StageDef } from '../model/league'
import {
  createTourney,
  openMatches,
  placings,
  settle,
  settleAll,
  type Contender,
} from './bracket'

const people = (n: number): Contender[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, rating: 1500 - i * 50 }))
const stage = (o: Partial<StageDef>): StageDef => ({ ...newStage('single'), ...o })

describe('bracket', () => {
  it('single elimination crowns one winner and everyone is placed once', () => {
    const t = settleAll(createTourney([stage({ kind: 'single' })], people(8), 1))
    expect(t.done).toBe(true)
    const p = placings(t)
    expect(p).toHaveLength(8)
    expect(new Set(p).size).toBe(8)
    expect(t.matches.filter((m) => m.b).length).toBe(7)
  })

  it('handles byes for a field that is not a power of two', () => {
    const t = settleAll(createTourney([stage({ kind: 'single' })], people(6), 2))
    expect(t.done).toBe(true)
    expect(placings(t)).toHaveLength(6)
  })

  it('double elimination: nobody is out before a second loss', () => {
    const t = settleAll(createTourney([stage({ kind: 'double' })], people(8), 3))
    expect(t.done).toBe(true)
    const losses = new Map<string, number>()
    for (const m of t.matches)
      if (m.b && m.winner) {
        const l = m.winner === m.a ? m.b : m.a
        losses.set(l, (losses.get(l) ?? 0) + 1)
      }
    const vals = [...losses.values()]
    expect(vals.filter((n) => n >= 2).length).toBe(7)
    expect(Math.max(...vals)).toBe(2)
    expect(placings(t)).toHaveLength(8)
  })

  it('chains stages: swiss then the top four into a knockout', () => {
    const t = settleAll(
      createTourney(
        [stage({ kind: 'swiss', rounds: 3, advance: 4 }), stage({ kind: 'single' })],
        people(12),
        4,
      ),
    )
    expect(t.done).toBe(true)
    expect(t.matches.some((m) => m.stage === 1)).toBe(true)
    expect(placings(t)).toHaveLength(12)
  })

  it('groups then double elimination works', () => {
    const t = settleAll(
      createTourney(
        [stage({ kind: 'groups', rounds: 2, advance: 2 }), stage({ kind: 'double' })],
        people(8),
        5,
      ),
    )
    expect(t.done).toBe(true)
  })

  it('a forfeit is a straight loss and the round moves on', () => {
    let t = createTourney([stage({ kind: 'single', bestOf: 3 })], people(4), 6)
    const m = openMatches(t)[0]
    t = settle(t, m.id, m.b!, undefined, true)
    const done = t.matches.find((x) => x.id === m.id)!
    expect(done.forfeit).toBe(true)
    expect(done.score).toEqual([0, 2])
  })

  it('is repeatable from the same seed and stronger players win more', () => {
    const a = placings(settleAll(createTourney([stage({ kind: 'single' })], people(8), 9)))
    const b = placings(settleAll(createTourney([stage({ kind: 'single' })], people(8), 9)))
    expect(a).toEqual(b)
    let top = 0
    for (let s = 0; s < 60; s++) {
      const c = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: '', rating: i === 0 ? 1900 : 1200 }))
      if (placings(settleAll(createTourney([stage({ kind: 'single' })], c, s)))[0] === 'p0') top++
    }
    expect(top).toBeGreaterThan(35)
  })
})
