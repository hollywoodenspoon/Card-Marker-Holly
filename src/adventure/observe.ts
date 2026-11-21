import { produce } from 'immer'
import { rulesOf } from './effects/registry'
import { other, type AsState, type Seat } from './state'

/** The id given to a card a player can't see. */
export const HIDDEN = '?'

/**
 * The game as one player may know it: the opponent's face-down field cards
 * and their Support are hidden (only how many there are shows), and so is the
 * random seed. A fair bot is only ever given this view.
 */
export function observeAs(s: AsState, seat: Seat): AsState {
  // The Kingdom's Emissary: the opponent's Support is shown to its owner.
  const shown = s.players[seat].field.some(
    (f) => !!f.card && f.faceUp && !!rulesOf(s, f.card)?.revealsSupport?.(s, seat),
  )
  return produce(s, (d) => {
    const opp = d.players[other(seat)]
    if (!shown) opp.support = opp.support.map(() => HIDDEN)
    for (const f of opp.field) if (f.card && !f.faceUp) f.card = HIDDEN
    d.seed = 0
    // A throw stays hidden until both players have thrown.
    if (d.rps && d.step.k === 'rps') d.rps[other(seat)] = null
  })
}
