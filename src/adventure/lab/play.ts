import { botMove } from '../bot'
import { quickMove } from '../bot/policies'
import type { AsCard } from '../cards'
import { checkGame } from '../check'
import { rulesOf } from '../effects/registry'
import { apply, createGame, type Move, type NewGame } from '../engine'
import type { AsState, Seat } from '../state'
import { fightingSpirit } from '../stats'

/**
 * The Balance lab's games: a slice of a stage, played in a worker. Each game
 * comes back as one small record; card uses are added up over the slice.
 */

/**
 * Does this Fighting Spirit reveal use the card's ability? A Rest card's
 * reveal is its ability; a coin card's coin is; a Battle bonus counts when
 * its condition holds. (Final Blow is counted from the log.)
 */
function fsUsesAbility(s: AsState, m: Move & { t: 'fs' }): boolean {
  if (m.from === 'rest') return true
  const r = rulesOf(s, m.card)
  if (r?.fsCoin) return true
  if (!r?.fs || !s.engagement || s.step.k !== 'fs') return false
  const printed = fightingSpirit(s, s.step.seat, m.card)
  return r.fs(s, s.step.seat, s.engagement, printed, m.card) > printed
}

/** Quick: the rules-of-thumb bot (about ten times faster). Normal: the table's Normal bot. */
export type LabBot = 'quick' | 'normal'

export interface LabGame {
  /** Indexes into the slice's decks, as seat 0 and seat 1. */
  a: number
  b: number
  seed: number
  /** Replay this game through the rules checker. */
  check?: boolean
}

export interface LabGameResult {
  a: number
  b: number
  winner: Seat | null
  /** Who had the initiative in round 1. */
  first: Seat
  rounds: number
}

export interface LabSlice {
  cards: AsCard[]
  decks: string[][]
  games: LabGame[]
  bot: LabBot
}

export interface LabSliceResult {
  games: LabGameResult[]
  /** Per card: Fighting Spirit reveals and ability uses. */
  uses: Record<string, [fs: number, abilities: number]>
  /** Checked games, and what the checker (or a refused move) found. */
  checked: number
  problems: string[]
}

const MAX_MOVES = 4000

export function playSlice({ cards, decks, games, bot }: LabSlice): LabSliceResult {
  const byName = new Map(cards.map((c) => [c.name, c.id]))
  const out: LabSliceResult = { games: [], uses: {}, checked: 0, problems: [] }
  const count = (id: string, k: 0 | 1) => (out.uses[id] ??= [0, 0])[k]++
  for (const g of games) {
    const game: NewGame = {
      cards,
      decks: [decks[g.a], decks[g.b]],
      names: ['A', 'B'],
      seed: g.seed,
    }
    let s = createGame(game)
    const r = { seed: g.seed ^ 0x9e3779b9 }
    const moves: Move[] = []
    let first = s.initiative
    let problem: string | null = null
    for (let n = 0; n < MAX_MOVES && s.step.k !== 'over'; n++) {
      // 'normal' is the lab's name for the Tricks bot (the table's Easy since v0.2.0).
      const m = bot === 'quick' ? quickMove(s, r) : botMove(s, 'easy', g.seed + n * 31)
      const next = apply(s, m)
      if (next === s) {
        problem = `a bot's move was refused: ${JSON.stringify(m)}`
        break
      }
      if (m.t === 'fs') {
        count(m.card, 0)
        if (fsUsesAbility(s, m)) count(m.card, 1)
      }
      if (m.t === 'ability') count(m.card, 1)
      if (g.check) moves.push(m)
      s = next
      if (s.round === 1 && s.step.k !== 'rps' && s.step.k !== 'initiative') first = s.initiative
    }
    // Flip and Battle Abilities and Final Blow happen by themselves: count them from the log.
    for (const l of s.log) {
      const name = /^(?:(?:Flip|Battle) Ability: (.+?): |Final Blow: (.+?) was the last)/.exec(
        l.text,
      )
      const id = name && byName.get(name[1] ?? name[2])
      if (id) count(id, 1)
    }
    const where = `seed ${g.seed}, decks ${g.a} and ${g.b}`
    if (problem) out.problems.push(`${where}: ${problem}`)
    else if (s.step.k !== 'over') out.problems.push(`${where}: not over after ${MAX_MOVES} moves`)
    if (g.check) {
      out.checked++
      for (const p of checkGame(game, moves).problems)
        out.problems.push(`${where}, move ${p.move + 1} (round ${p.round}): ${p.text}`)
    }
    out.games.push({ a: g.a, b: g.b, winner: s.winner?.seat ?? null, first, rounds: s.round })
  }
  return out
}

/** Add up slices of the same decks (in order). */
export function mergeSlices(parts: LabSliceResult[]): LabSliceResult {
  const out: LabSliceResult = { games: [], uses: {}, checked: 0, problems: [] }
  for (const p of parts) {
    out.games.push(...p.games)
    for (const [id, [f, a]] of Object.entries(p.uses)) {
      const u = (out.uses[id] ??= [0, 0])
      u[0] += f
      u[1] += a
    }
    out.checked += p.checked
    out.problems.push(...p.problems)
  }
  return out
}
