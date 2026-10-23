import { actor } from '@/adventure/engine'
import { SEATS, type AsState, type Seat } from '@/adventure/state'
import { pieceId } from '@/adventure/table'

/**
 * What a card game app would announce for one action, from the board before
 * and after it: a phase banner, an ability's card zooming up, and a line from
 * an ability's card to the card it picked. Pure, so the table and replays
 * read the same announcements.
 */

export type Banner = { kind: 'phase'; text: string; sub?: string }

export interface Activation {
  /** The card whose ability activates (a piece id). */
  piece: string
  card: string
  /** How it was used: "Field Ability", "Flip Ability", … */
  how: string
}

export interface TargetLine {
  from: string
  to: string
}

export interface Spot {
  banner: Banner | null
  activation: Activation | null
  target: TargetLine | null
}

const PHASE: Partial<Record<AsState['phase'], string>> = {
  skirmish: 'Skirmish',
  combat: 'Combat',
  regroup: 'Regroup',
}

/** The piece of the card a line names: the copy on `seat`'s side when given. */
function findCard(s: AsState, name: string, seat?: Seat): { piece: string; card: string } | null {
  const seats = seat === undefined ? SEATS : [seat, ...SEATS.filter((x) => x !== seat)]
  for (const x of seats) {
    const p = s.players[x]
    const cards = [
      ...p.field.flatMap((f) => (f.card ? [f.card] : [])),
      ...p.support,
      ...p.rest,
      ...p.spent,
    ]
    const card = cards.find((c) => s.cards[c]?.name === name)
    if (card) return { piece: pieceId(x, card), card }
  }
  return null
}

const seatNamed = (s: AsState, text: string): Seat | undefined =>
  SEATS.find((x) => text.startsWith(s.players[x].name + ' '))

/** Ability lines: the card that activates and how. */
const ABILITY: { re: RegExp; how: string; owner?: 'line' }[] = [
  { re: /^.+? uses (.+?)'s Field Ability/, how: 'Field Ability', owner: 'line' },
  { re: /^Flip Ability: (.+?): /, how: 'Flip Ability' },
  { re: /^Battle Ability: (.+?): /, how: 'Battle Ability' },
  { re: /^.+? reveals (.+?) from their Support: /, how: 'Support Ability', owner: 'line' },
]

/**
 * `human`: the one seat a person plays against a bot, for a "Your turn"
 * banner when the turn comes back to them.
 */
export function spotlight(prev: AsState, next: AsState, human?: Seat): Spot {
  const spot: Spot = { banner: null, activation: null, target: null }
  if (next.log.length <= prev.log.length) return spot
  const line = next.log.at(-1)!.text

  if (next.winner && !prev.winner)
    spot.banner = { kind: 'phase', text: 'Victory', sub: next.players[next.winner.seat].name }
  else if (next.round !== prev.round || (next.phase !== prev.phase && PHASE[next.phase]))
    spot.banner = {
      kind: 'phase',
      text: PHASE[next.phase] ?? '',
      sub: next.phase === 'skirmish' ? `Round ${next.round}` : undefined,
    }
  if (
    !spot.banner &&
    human !== undefined &&
    actor(next) === human &&
    actor(prev) !== human &&
    next.step.k !== 'over'
  )
    spot.banner = { kind: 'phase', text: 'Your turn' }
  const engagement = /^(First|Second|Next) Engagement: /.exec(line)
  if (engagement) spot.banner = { kind: 'phase', text: `${engagement[1]} Engagement` }

  for (const a of ABILITY) {
    const m = a.re.exec(line)
    if (!m) continue
    const found = findCard(next, m[1], a.owner === 'line' ? seatNamed(next, line) : undefined)
    if (found) spot.activation = { ...found, how: a.how }
    break
  }

  // "Player chooses Card (Player's Position)": a line from the ability's card to it.
  const chose = /^(.+?) chooses (.+?) \((.+?)'s /.exec(line)
  if (chose && next.pending) {
    const owner = next.pending.ctx.owner
    const from = pieceId(owner, next.pending.source)
    const side = SEATS.find((x) => next.players[x].name === chose[3])
    const to = findCard(next, chose[2], side)
    if (to && to.piece !== from) spot.target = { from, to: to.piece }
  }
  return spot
}
