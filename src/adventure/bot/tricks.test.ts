import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { apply, createGame } from '../engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '../fixtures/firstQuest'
import type { AsState } from '../state'
import { quickMove } from './policies'
import { evaluate, projectAssignment } from './tricks'

const decks = Object.values(FIRST_QUEST_DECKS)

/** Quick play until the initiative player's final Skirmish response. */
function beforeAssignment(seed: number): AsState | null {
  let s = createGame({
    cards: FIRST_QUEST,
    decks: [decks[seed % 3], decks[(seed + 1) % 3]],
    names: ['A', 'B'],
    seed,
  })
  for (let n = 0; n < 500; n++) {
    if (s.step.k === 'respond' && s.step.final) return s
    if (s.step.k === 'over') return null
    s = apply(s, quickMove(s, { seed: seed * 7 + n }))
  }
  return null
}

describe('Skirmish and Combat Tricks', () => {
  it('predict the Attack/Defense Assignment the engine makes', () => {
    let checked = 0
    for (let seed = 1; seed <= 40; seed++) {
      const s = beforeAssignment(seed)
      if (!s) continue
      const after = apply(s, { t: 'pass' })
      if (after.phase !== 'combat') continue
      const p = projectAssignment(s)
      for (const seat of [0, 1] as const) {
        expect(p.players[seat].field.map((f) => f.state)).toEqual(
          after.players[seat].field.map((f) => f.state),
        )
        expect(p.players[seat].mainAttacker).toBe(after.players[seat].mainAttacker)
      }
      checked++
    }
    expect(checked).toBeGreaterThan(15)
  })

  it('value a Main Attacker that hits an undefended position', () => {
    let s: AsState | null = null
    for (let seed = 1; !s && seed < 50; seed++) s = beforeAssignment(seed)
    if (!s) throw new Error('no game reached the final response')
    const p = projectAssignment(s)
    const seat = 0
    const main = p.players[seat].mainAttacker!
    // The mirrored target and its neighbours: make them all attackers (no defence there), or all defenders.
    const target = [0, 1, 2, 3, 4, 5].find(
      (i) => i % 3 === 2 - (main % 3) && Math.floor(i / 3) === Math.floor(main / 3),
    )!
    const open = produce(s, (d) => {
      d.phase = 'combat'
      for (const pl of d.players) {
        for (const [i, f] of pl.field.entries())
          f.state = p.players[d.players.indexOf(pl)].field[i].state
      }
      d.players[0].mainAttacker = main
      d.players[1].mainAttacker = null
      for (const f of d.players[1].field) f.state = 'attacking'
      d.queue = [0]
    })
    const guarded = produce(open, (d) => {
      for (const f of d.players[1].field) f.state = 'defending'
    })
    expect(target).toBeGreaterThanOrEqual(0)
    expect(evaluate(open, seat)).toBeGreaterThan(evaluate(guarded, seat))
  })
})
