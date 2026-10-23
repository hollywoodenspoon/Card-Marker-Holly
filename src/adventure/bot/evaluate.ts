import { other, SEATS, type AsState, type Seat } from '../state'
import { engagementSides, engagementTotals } from '../stats'

/**
 * How good a board looks for a seat: points so far plus the expected points of
 * this round's combat. Shared by the Tricks, Quick's ability check and MCTS.
 */

const fate = (s: AsState, c: string) => s.cards[c]?.fate ?? 0

/** Attack/Defense Assignment as the engine will make it, on every field (all cards treated as revealed). */
export function projectAssignment(s: AsState): AsState {
  // A light copy: only the fields change.
  const players = s.players.map((p) => {
    const field = p.field.map((f) => ({ ...f, faceUp: !!f.card }))
    const all = field.flatMap((f, i) => (f.card && f.state === 'ready' ? [i] : []))
    const fateAt = (i: number) => fate(s, field[i].card!)
    const extra = all.filter((i) => p.round.extra.includes(field[i].card!))
    const byFate = (a: number, b: number) => fateAt(a) - fateAt(b)
    const ready = all.filter((i) => !extra.includes(i)).sort(byFate)
    const n = Math.floor(ready.length / 2)
    ready.forEach((i, k) => (field[i].state = k < n ? 'attacking' : 'defending'))
    for (const i of extra) field[i].state = 'attacking'
    const mainAttacker = [...ready.slice(0, n), ...extra].sort(byFate)[0] ?? null
    return { ...p, field, mainAttacker }
  }) as AsState['players']
  return { ...s, players }
}

const sigma = (z: number) => 1 / (1 + Math.exp(-z))
const pool = (s: AsState, seat: Seat) =>
  s.players[seat].support.reduce((n, c) => n + (s.cards[c]?.fs ?? 0), 0)

/** Expected points for `seat` minus the opponent's, from an Engagement with this starting margin. */
function engagementEdge(margin: number, fsEdge: number, attackerIsSeat: boolean) {
  const z = margin + 0.35 * fsEdge
  const pAtt = sigma((z - 0.5) / 1.5)
  const pDef = sigma((-z - 0.5) / 1.5)
  return (attackerIsSeat ? 1 : -1) * (pAtt - pDef)
}

/** How good the game looks for `seat`: points so far plus the expected points of this round's combat. */
export function evaluate(s: AsState, seat: Seat): number {
  if (s.winner) return s.winner.seat === seat ? 20 : -20
  const opp = other(seat)
  let v = s.players[seat].points - s.players[opp].points
  if (s.phase !== 'skirmish' && s.phase !== 'combat') return v
  const p = s.phase === 'skirmish' ? projectAssignment(s) : s
  const fs = (x: Seat) => pool(p, x)
  const attackers: Seat[] =
    s.phase === 'skirmish'
      ? [...SEATS]
      : [...(s.engagement ? [s.engagement.attacker] : []), ...s.queue]
  for (const a of attackers) {
    const sides = engagementSides(p, a)
    if (!sides) continue
    if (!sides.defenders.length) {
      v += a === seat ? 1 : -1
      continue
    }
    let margin: number
    let fsA = fs(a)
    let fsD = fs(other(a))
    if (s.engagement && s.engagement.attacker === a) {
      const t = engagementTotals(p, s.engagement)
      margin = t.attack - t.defense
      if (s.engagement.passed[a]) fsA = 0
      if (s.engagement.passed[other(a)]) fsD = 0
    } else {
      const t = engagementTotals(p, {
        attacker: a,
        fs: [[], []],
        passed: [false, false],
        tried: [],
      })
      margin = t.attack - t.defense
    }
    v += engagementEdge(margin, fsA - fsD, a === seat)
  }
  // Fighting Spirit kept for later rounds is worth a little.
  return v + 0.03 * (fs(seat) - fs(opp))
}
