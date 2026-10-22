import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { createGame } from '@/adventure/engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '@/adventure/fixtures/firstQuest'
import type { AsState } from '@/adventure/state'
import { pieceId } from '@/adventure/table'
import { zoneKey } from '@/playtest/setup'
import { cardsInLine, cues } from './cues'

const [guild, retinue] = Object.values(FIRST_QUEST_DECKS)

/** Both fields filled from Support, face down, in order. */
function placed(): AsState {
  const s = createGame({ cards: FIRST_QUEST, decks: [guild, retinue], names: ['A', 'B'], seed: 3 })
  return produce(s, (d) => {
    for (const p of d.players)
      p.field = p.support.splice(0, 6).map((card) => ({ card, faceUp: false, state: 'ready' }))
  })
}

describe('cues', () => {
  const s = placed()
  const card = (seat: 0 | 1, slot: number) => s.players[seat].field[slot].card!

  it('lights up revealed cards', () => {
    const t = produce(s, (d) => {
      d.players[1].field[0].faceUp = true
      d.players[1].field[1].faceUp = true
    })
    const c = cues(s, t)
    expect(c.glow).toEqual({
      [pieceId(1, card(1, 0))]: 'reveal',
      [pieceId(1, card(1, 1))]: 'reveal',
    })
    expect(c.arrows).toEqual([])
  })

  it('draws a double arrow for two field cards that trade places', () => {
    const t = produce(s, (d) => {
      const f = d.players[0].field
      ;[f[0], f[4]] = [f[4], f[0]]
    })
    const c = cues(s, t)
    expect(c.arrows).toEqual([
      {
        from: { piece: pieceId(0, card(0, 4)) },
        to: { piece: pieceId(0, card(0, 0)) },
        both: true,
      },
    ])
    expect(c.glow[pieceId(0, card(0, 0))]).toBe('moved')
    expect(c.glow[pieceId(0, card(0, 4))]).toBe('moved')
  })

  it('draws a double arrow when a Support card replaces a field card', () => {
    const fromSupport = s.players[1].support[0]
    const t = produce(s, (d) => {
      const p = d.players[1]
      const out = p.field[2].card!
      p.support.splice(0, 1)
      p.field[2].card = fromSupport
      p.rest.push(out)
    })
    expect(cues(s, t).arrows).toEqual([
      {
        from: { piece: pieceId(1, fromSupport) },
        to: { piece: pieceId(1, card(1, 2)) },
        both: true,
      },
    ])
  })

  it('draws a one-way arrow into an empty position', () => {
    const t0 = produce(s, (d) => {
      d.players[0].field[3] = { card: null, faceUp: false, state: 'ready' }
    })
    const back = t0.players[0].support[0]
    const t1 = produce(t0, (d) => {
      d.players[0].support.splice(0, 1)
      d.players[0].field[3].card = back
    })
    expect(cues(t0, t1).arrows).toEqual([
      { from: { zone: zoneKey('support', 0) }, to: { piece: pieceId(0, back) }, both: false },
    ])
  })

  it('lights up Fighting Spirit, from Support and from the rest zone', () => {
    const c0 = produce(s, (d) => {
      d.engagement = { attacker: 0, fs: [[], []], passed: [false, false], tried: [] }
      d.players[1].rest.push(d.players[1].support.pop()!)
    })
    const sup = c0.players[0].support[0]
    const rest = c0.players[1].rest[0]
    const c1 = produce(c0, (d) => {
      d.players[0].support.splice(0, 1)
      d.players[0].spent.push(sup)
      d.engagement!.fs[0].push({ card: sup, value: 2, from: 'support' })
      d.engagement!.fs[1].push({ card: rest, value: 1, from: 'rest' })
    })
    expect(cues(c0, c1).glow).toEqual({ [pieceId(0, sup)]: 'fs', [pieceId(1, rest)]: 'fs' })
  })
})

describe('cardsInLine', () => {
  it('finds the cards a line names, longest name first, in line order', () => {
    const s = placed()
    const a = s.players[0].field[0].card!
    const b = s.players[1].field[1].card!
    const text = `${s.cards[b].name} swaps with ${s.cards[a].name}.`
    const ids = cardsInLine(s, text, {})
    expect(ids.slice(0, 2)).toEqual([pieceId(1, b), pieceId(0, a)])
  })
})
