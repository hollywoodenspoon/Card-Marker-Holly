import { describe, expect, it, beforeEach } from 'vitest'
import { legalMoves, type NewGame } from '@/adventure/engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '@/adventure/fixtures/firstQuest'
import { adventureScuffle } from '@/playtest/setup'
import { usePlaytest } from './usePlaytest'

const [guild, retinue] = Object.values(FIRST_QUEST_DECKS)
const setup = adventureScuffle({ w: 63, h: 88 })
const game: NewGame = { cards: FIRST_QUEST, decks: [guild, retinue], names: ['A', 'B'], seed: 11 }
const pt = () => usePlaytest.getState()

/** Play the first legal move (not taking cards back), then finish its playback. */
function step() {
  const m = legalMoves(pt().rules!).filter((x) => x.t !== 'unplace')[0]
  pt().play(m)
  pt().skip()
}

describe('the Playtest store with the rules on', () => {
  beforeEach(() => {
    pt().end()
    pt().setSpeed('normal')
    pt().startRules('p', setup, game, { hotseat: false })
  })

  it('shows a move action by action, and ignores taps meanwhile', () => {
    for (let i = 0; i < 40 && !pt().playback; i++) {
      pt().play(legalMoves(pt().rules!).filter((x) => x.t !== 'unplace')[0])
      if (!pt().playback || pt().playback!.frames.length < 2) pt().skip()
    }
    const pb = pt().playback!
    expect(pb.frames.length).toBeGreaterThan(1)
    expect(pb.frames.at(-1)).toBe(pt().rules)
    const rules = pt().rules
    expect(pt().tapRules('s0-whatever')).toBe(false)
    pt().act({ t: 'flip', piece: 's0-whatever' })
    expect(pt().rules).toBe(rules)
    pt().nextFrame()
    expect(pt().playback?.i ?? pb.frames.length).toBeGreaterThan(0)
    pt().skip()
    expect(pt().playback).toBeNull()
  })

  it('plays without pauses in Rush', () => {
    pt().setSpeed('rush')
    step()
    pt().play(legalMoves(pt().rules!)[0])
    expect(pt().playback).toBeNull()
  })

  it('records the moves, and undo takes them back', () => {
    for (let i = 0; i < 20; i++) step()
    const n = pt().moves.flat().length
    expect(n).toBeGreaterThan(0)
    pt().undo()
    expect(pt().moves.flat().length).toBeLessThan(n)
    pt().redo()
    expect(pt().moves.flat().length).toBe(n)
  })

  it('watches a game from its moves, then gives the open game back', () => {
    for (let i = 0; i < 30; i++) step()
    const { rules, moves } = pt()
    pt().watch(setup, game, moves.flat(), 'Test')
    const r = pt().replay!
    expect(r.frames.at(-1)).toEqual(rules)
    expect(pt().rules).toBe(r.frames[0])
    pt().seek(r.frames.length - 1)
    expect(pt().rules).toEqual(rules)
    pt().leaveReplay()
    expect(pt().replay).toBeNull()
    expect(pt().rules).toBe(rules)
  })
})
