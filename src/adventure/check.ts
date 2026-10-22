import { apply, createGame, isLegal, type Move, type NewGame } from './engine'
import { SEATS, type AsState } from './state'

/**
 * Replay a game and check it against the rules' invariants. Used by the tests
 * on many bot games, and on replay files exported from Hearthside Table.
 */

export interface Problem {
  /** The move (0-based) after which it was found. */
  move: number
  round: number
  text: string
  /** The last log lines up to it. */
  log: string[]
}

export interface CheckResult {
  problems: Problem[]
  /** The state after the last move that could be played. */
  final: AsState
}

/** The rulebook's cap: no card's Fighting Spirit may exceed 3. */
const MAX_FS = 3

/** Every card of each deck in exactly one place (field, Support, rest zone, spent). */
function lostOrDoubled(s: AsState, decks: NewGame['decks']): string[] {
  return SEATS.flatMap((seat) => {
    const p = s.players[seat]
    const held = [
      ...p.field.flatMap((f) => (f.card ? [f.card] : [])),
      ...p.support,
      ...p.rest,
      ...p.spent,
    ]
    const count = (list: string[]) =>
      list.reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map<string, number>())
    const want = count(decks[seat])
    const have = count(held)
    const out: string[] = []
    for (const [c, n] of want)
      if ((have.get(c) ?? 0) !== n)
        out.push(`${p.name}: ${s.cards[c]?.name ?? c} is held ${have.get(c) ?? 0} times.`)
    for (const c of have.keys())
      if (!want.has(c)) out.push(`${p.name}: ${s.cards[c]?.name ?? c} isn't in their deck.`)
    return out
  })
}

export function checkGame(game: NewGame, moves: Move[]): CheckResult {
  let s = createGame(game)
  const problems: Problem[] = []
  const report = (move: number, text: string) =>
    problems.push({ move, round: s.round, text, log: s.log.slice(-6).map((l) => l.text) })
  for (const [i, m] of moves.entries()) {
    if (!isLegal(s, m)) {
      report(i, `Move ${i + 1} isn't legal here: ${JSON.stringify(m)} at step ${s.step.k}.`)
      break
    }
    const before = s
    s = apply(s, m)
    if (s === before) {
      report(i, `Move ${i + 1} changed nothing: ${JSON.stringify(m)}.`)
      break
    }
    for (const text of lostOrDoubled(s, game.decks)) report(i, text)
    // Each Skirmish starts with full fields.
    if (s.phase === 'skirmish' && before.phase !== 'skirmish')
      for (const seat of SEATS) {
        const n = s.players[seat].field.filter((f) => f.card).length
        if (n !== 6)
          report(i, `${s.players[seat].name} starts round ${s.round} with ${n} field cards.`)
      }
    const e = s.engagement
    if (e)
      for (const seat of SEATS) {
        const old = before.engagement?.fs[seat].length ?? 0
        for (const x of e.fs[seat].slice(old))
          if (x.value > MAX_FS)
            report(
              i,
              `${s.cards[x.card]?.name ?? x.card} is revealed for ${x.value} Fighting Spirit (over ${MAX_FS}).`,
            )
      }
    if (problems.length >= 20) break
  }
  return { problems, final: s }
}
