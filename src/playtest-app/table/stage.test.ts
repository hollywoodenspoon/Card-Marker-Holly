import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { createGame } from '@/adventure/engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '@/adventure/fixtures/firstQuest'
import type { AsState, CardState } from '@/adventure/state'
import { FS_STRIP, STRIP, stageFrame, stageLayout } from './stage'

const [guild, retinue] = Object.values(FIRST_QUEST_DECKS)
const SIZE = { w: 60, h: 90 }

/**
 * Both fields face up. Seat 0 attacks from position 1 (Front Line, Center), with
 * 0 and 2 beside it and 3 out of reach; seat 1 defends on 0, 1 (the target) and
 * 3 (out of reach).
 */
function engagement(): AsState {
  const s = createGame({ cards: FIRST_QUEST, decks: [guild, retinue], names: ['A', 'B'], seed: 3 })
  const states: CardState[][] = [
    ['attacking', 'attacking', 'attacking', 'attacking', 'defending', 'defending'],
    ['defending', 'defending', 'attacking', 'defending', 'attacking', 'ready'],
  ]
  return produce(s, (d) => {
    d.players.forEach((p, seat) => {
      p.field = p.support
        .splice(0, 6)
        .map((card, i) => ({ card, faceUp: true, state: states[seat][i] }))
    })
    d.phase = 'combat'
    d.players[0].mainAttacker = 1
    d.engagement = { attacker: 0, fs: [[], []], passed: [false, false], tried: [] }
  })
}

describe('stageLayout', () => {
  it('lays every counting attacker sideways, the Main Attacker in front', () => {
    const s = engagement()
    const atk = stageLayout(s, s.engagement!, SIZE).atk.cards
    expect(atk.map((c) => c.kind)).toEqual(['main', 'attacker', 'attacker'])
    const field = s.players[0].field
    expect(atk.map((c) => c.card)).toEqual([field[1].card, field[0].card, field[2].card])
    // Active cards lie sideways, swords up: none stands upright.
    expect(atk.every((c) => c.rotation === 90)).toBe(true)
    // Each one behind shows one strip above the one in front of it.
    const top = (c: (typeof atk)[number]) => c.cy - SIZE.w / 2
    expect(top(atk[0]) - top(atk[1])).toBeCloseTo(STRIP * SIZE.w)
    expect(top(atk[1]) - top(atk[2])).toBeCloseTo(STRIP * SIZE.w)
    expect(atk[0].z).toBeGreaterThan(atk[1].z)
    expect(top(atk[2])).toBeCloseTo(0)
  })

  it('lays a lone Main Attacker sideways too', () => {
    const s = produce(engagement(), (d) => {
      d.players[0].field[0].state = 'defending'
      d.players[0].field[2].state = 'defending'
    })
    const atk = stageLayout(s, s.engagement!, SIZE).atk
    expect(atk.cards.map((c) => [c.kind, c.rotation])).toEqual([['main', 90]])
    expect(atk.h).toBeCloseTo(SIZE.w)
    expect(atk.w).toBeCloseTo(SIZE.h)
  })

  it('counts every attacker with Attack Unbound', () => {
    const s = produce(engagement(), (d) => void (d.players[0].round.attackUnbound = true))
    expect(stageLayout(s, s.engagement!, SIZE).atk.cards).toHaveLength(4)
  })

  it('lays every counting defender sideways, shields up', () => {
    const s = engagement()
    const def = stageLayout(s, s.engagement!, SIZE).def.cards
    expect(def.every((c) => c.kind === 'defender' && c.rotation === -90)).toBe(true)
    expect(def.map((c) => c.card).sort()).toEqual(
      [s.players[1].field[0].card, s.players[1].field[1].card].sort(),
    )
  })

  it('stands Fighting Spirit upright in front of the stack, newest lowest', () => {
    const s0 = engagement()
    const [a, b] = s0.players[0].support
    const s = produce(s0, (d) => {
      d.engagement!.fs[0] = [
        { card: a, value: 2, from: 'support' },
        { card: b, value: 3, from: 'support' },
      ]
    })
    const g = stageLayout(s, s.engagement!, SIZE).atk
    const stack = g.cards.filter((c) => c.kind !== 'fs')
    const fs = g.cards.filter((c) => c.kind === 'fs')
    expect(fs.map((c) => [c.card, c.value, c.rotation])).toEqual([
      [a, 2, 0],
      [b, 3, 0],
    ])
    // In front of the stack, the newest in front and one flame strip lower.
    expect(Math.min(...fs.map((c) => c.z))).toBeGreaterThan(Math.max(...stack.map((c) => c.z)))
    expect(fs[1].z).toBeGreaterThan(fs[0].z)
    expect(fs[1].cy - fs[0].cy).toBeCloseTo(FS_STRIP * SIZE.h)
    // Below the front card's strip, so every sideways strip still shows.
    const frontTop = stack[0].cy - SIZE.w / 2
    expect(fs[0].cy - SIZE.h / 2).toBeCloseTo(frontTop + STRIP * SIZE.w)
    // Centred on the stack, inside the group.
    expect(fs[0].cx).toBeCloseTo(g.w / 2)
    expect(g.h).toBeCloseTo(fs[1].cy + SIZE.h / 2)
  })
})

describe('stageFrame', () => {
  it('keeps the stage up through the result line', () => {
    const s = engagement()
    const ended = produce(s, (d) => {
      d.engagement = null
      d.log.push({ n: d.log.length + 1, text: 'Attack 5 vs Defense 3: A scores.' })
    })
    const next = produce(ended, (d) => {
      d.log.push({ n: d.log.length + 1, text: 'Regroup: everything rests.' })
    })
    expect(stageFrame([s, ended], 1)?.e).toEqual(s.engagement)
    expect(stageFrame([s, ended, next], 2)).toBeNull()
  })
})
