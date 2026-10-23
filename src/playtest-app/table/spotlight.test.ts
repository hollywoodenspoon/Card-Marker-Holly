import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { createGame } from '@/adventure/engine'
import { basicCards, basicDecks } from '@/adventure/fixtures/basic'
import type { AsState } from '@/adventure/state'
import { pieceId } from '@/adventure/table'
import { spotlight } from './spotlight'

const game = () =>
  createGame({ cards: basicCards(), decks: basicDecks(), names: ['Ann', 'Bo'], seed: 3 })

/** The next board: one more log line, with `edit` applied. */
const after = (s: AsState, text: string, edit: (d: AsState) => void = () => {}) =>
  produce(s, (d) => {
    d.log.push({ n: d.log.length + 1, text })
    edit(d)
  })

describe('spotlight', () => {
  it('announces a new phase, a new round and an Engagement', () => {
    const s = game()
    const skirmish = after(s, 'Round 1: Skirmish.', (d) => void (d.phase = 'skirmish'))
    expect(spotlight(s, skirmish).banner).toEqual({
      kind: 'phase',
      text: 'Skirmish',
      sub: 'Round 1',
    })
    const fight = after(skirmish, "First Engagement: Ann's X attacks Front Line Left Flank.")
    expect(spotlight(skirmish, fight).banner?.text).toBe('First Engagement')
    expect(spotlight(fight, after(fight, 'Attack 3 vs Defense 2.')).banner).toBeNull()
  })

  it("zooms up the card of an ability as it activates, on its owner's side", () => {
    const s = game()
    const card = s.players[1].support[0]
    const name = s.cards[card].name
    const used = after(s, `Bo reveals ${name} from their Support: Swap two cards.`)
    expect(spotlight(s, used).activation).toEqual({
      piece: pieceId(1, card),
      card,
      how: 'Support Ability',
    })
  })

  it('draws a line from the ability to the card it chose', () => {
    const s = game()
    const source = s.players[0].support[0]
    const target = s.players[1].support[1]
    const pending = produce(s, (d) => {
      d.pending = {
        ctx: { owner: 0, card: source, mode: 'support' },
        source,
        answers: [],
        after: { k: 'flips', respond: 1 },
      }
    })
    const chose = after(pending, `Ann chooses ${s.cards[target].name} (Bo's Front Line Center).`)
    expect(spotlight(pending, chose).target).toEqual({
      from: pieceId(0, source),
      to: pieceId(1, target),
    })
  })

  it("says when it's the person's turn again, against a bot", () => {
    const s = produce(game(), (d) => {
      d.step = { k: 'fs', seat: 1 }
    })
    const back = after(s, 'Player passes.', (d) => void (d.step = { k: 'fs', seat: 0 }))
    expect(spotlight(s, back, 0).banner?.text).toBe('Your turn')
    expect(spotlight(s, back).banner).toBeNull()
  })
})
