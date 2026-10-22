import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { createGame } from '@/adventure/engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '@/adventure/fixtures/firstQuest'
import type { AsState, CardState } from '@/adventure/state'
import { pieceId } from '@/adventure/table'
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
  it('stacks the counting attackers behind the upright Main Attacker', () => {
    const s = engagement()
    const st = stageLayout(s, s.engagement!, SIZE)
    const atk = st.atk.cards
    expect(atk.map((c) => c.kind)).toEqual(['main', 'attacker', 'attacker'])
    const field = s.players[0].field
    expect(atk[0].id).toBe(pieceId(0, field[1].card!))
    expect(atk.slice(1).map((c) => c.card)).toEqual([field[0].card, field[2].card])
    expect(atk.slice(1).every((c) => c.rotation === 90)).toBe(true)
    // Each sideways card shows one strip above the one in front of it.
    const top = (c: (typeof atk)[number]) => c.cy - (c.rotation ? SIZE.w : SIZE.h) / 2
    expect(top(atk[0]) - top(atk[1])).toBeCloseTo(STRIP * SIZE.w)
    expect(top(atk[1]) - top(atk[2])).toBeCloseTo(STRIP * SIZE.w)
    expect(atk[0].z).toBeGreaterThan(atk[1].z)
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

  it('fans Fighting Spirit beside the stack, newest in front', () => {
    const s0 = engagement()
    const [a, b] = s0.players[0].support
    const s = produce(s0, (d) => {
      d.engagement!.fs[0] = [
        { card: a, value: 2, from: 'support' },
        { card: b, value: 3, from: 'support' },
      ]
    })
    const g = stageLayout(s, s.engagement!, SIZE).atk
    const fs = g.cards.filter((c) => c.kind === 'fs')
    expect(fs.map((c) => [c.card, c.value])).toEqual([
      [b, 3],
      [a, 2],
    ])
    expect(fs[0].z).toBeGreaterThan(fs[1].z)
    expect(fs[0].cy - fs[1].cy).toBeCloseTo(FS_STRIP * SIZE.h)
    // Beside the stack, inside the group.
    expect(fs[0].cx - SIZE.w / 2).toBeGreaterThan(SIZE.h)
    expect(g.w).toBeCloseTo(fs[0].cx + SIZE.w / 2)
    for (const c of g.cards) expect(c.cy).toBeGreaterThan(0)
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
