import { apply, createGame, type Move } from '../engine'
import type { AsCard } from '../cards'
import { botMove, BOT_NAMES, type BotLevel } from '../bot'
import type { AsState, Seat } from '../state'

/**
 * Balance runs: bot-against-bot games with no screen, and a Markdown report
 * (win rates per deck, per card and per level, and anything that went wrong).
 */

export interface SimOptions {
  cards: AsCard[]
  /** Free Companies by name. */
  decks: Record<string, string[]>
  games: number
  /** The bot level for seat 0 and seat 1 (seats swap every game). */
  levels: [BotLevel, BotLevel]
  seed?: number
  /** Hard bots: playouts per decision. */
  playouts?: number
  /** Called after each game (for a progress line). */
  onGame?: (done: number) => void
}

interface CardStat {
  games: number
  wins: number
  fs: number
  abilities: number
}

export interface SimResult {
  options: Omit<SimOptions, 'onGame' | 'cards'>
  cardNames: Record<string, string>
  played: number
  unfinished: number
  problems: string[]
  rounds: number
  moves: number
  /** Wins of the player who had the initiative in round 1. */
  firstWins: number
  /** [games, wins] per deck. */
  decks: Record<string, [number, number]>
  /** Wins of the row deck against the column deck, and games. */
  matrix: Record<string, Record<string, [number, number]>>
  levels: Record<string, [number, number]>
  cards: Record<string, CardStat>
}

const hidden = (s: AsState, seat: Seat) => {
  const p = s.players[seat]
  return [...p.field.flatMap((f) => (f.card ? [f.card] : [])), ...p.support, ...p.rest, ...p.spent]
}

export function simulate(o: SimOptions): SimResult {
  const names = Object.keys(o.decks)
  const res: SimResult = {
    options: {
      decks: o.decks,
      games: o.games,
      levels: o.levels,
      seed: o.seed,
      playouts: o.playouts,
    },
    cardNames: Object.fromEntries(o.cards.map((c) => [c.id, c.name])),
    played: 0,
    unfinished: 0,
    problems: [],
    rounds: 0,
    moves: 0,
    firstWins: 0,
    decks: Object.fromEntries(names.map((n) => [n, [0, 0]])),
    matrix: Object.fromEntries(
      names.map((a) => [a, Object.fromEntries(names.map((b) => [b, [0, 0]]))]),
    ),
    levels: {},
    cards: {},
  }
  const card = (id: string) => (res.cards[id] ??= { games: 0, wins: 0, fs: 0, abilities: 0 })
  const base = o.seed ?? 1
  for (let g = 0; g < o.games; g++) {
    // Every pairing in turn, seats swapped on alternate games.
    const pair = Math.floor(g / 2)
    const da = names[pair % names.length]
    const db = names[Math.floor(pair / names.length) % names.length]
    const swap = g % 2 === 1
    const deckNames: [string, string] = swap ? [db, da] : [da, db]
    const levels: [BotLevel, BotLevel] = swap ? [o.levels[1], o.levels[0]] : o.levels
    const seed = (base * 1_000_003 + g * 7919) >>> 0
    let s = createGame({
      cards: o.cards,
      decks: [o.decks[deckNames[0]], o.decks[deckNames[1]]],
      names: [deckNames[0], deckNames[1]],
      seed,
    })
    const first = s.initiative
    const used: Move[][] = [[], []]
    let n = 0
    try {
      for (; n < 4000 && s.step.k !== 'over'; n++) {
        const seat = s.step.seat
        const m = botMove(s, levels[seat], seed + n * 31, { playouts: o.playouts })
        const next = apply(s, m)
        if (next === s) throw new Error(`a bot's move was refused: ${JSON.stringify(m)}`)
        used[seat].push(m)
        s = next
        for (const x of [0, 1] as const) {
          const all = hidden(s, x)
          if (all.length !== 12 || new Set(all).size !== 12)
            throw new Error(`a card went missing or doubled (player ${x + 1})`)
        }
      }
    } catch (e) {
      res.problems.push(
        `Game ${g + 1} (seed ${seed}): ${e instanceof Error ? e.message : String(e)}`,
      )
    }
    res.played++
    res.moves += n
    res.rounds += s.round
    const winner = s.winner?.seat
    if (winner === undefined) res.unfinished++
    else {
      if (winner === first) res.firstWins++
      const loser = winner === 0 ? 1 : 0
      res.matrix[deckNames[winner]][deckNames[loser]][0]++
    }
    for (const seat of [0, 1] as const) {
      const won = winner === seat
      const d = res.decks[deckNames[seat]]
      d[0]++
      if (won) d[1]++
      res.matrix[deckNames[seat]][deckNames[seat === 0 ? 1 : 0]][1]++
      const lv = (res.levels[BOT_NAMES[levels[seat]]] ??= [0, 0])
      lv[0]++
      if (won) lv[1]++
      for (const id of o.decks[deckNames[seat]]) {
        const c = card(id)
        c.games++
        if (won) c.wins++
      }
      for (const m of used[seat]) {
        if (m.t === 'fs') card(m.card).fs++
        if (m.t === 'ability') card(m.card).abilities++
      }
    }
    // Flip and Battle Abilities happen by themselves: count them from the log.
    for (const l of s.log) {
      const flip = /^(?:Flip|Battle) Ability: (.+?): /.exec(l.text)?.[1]
      if (!flip) continue
      const id = o.cards.find((c) => c.name === flip)?.id
      if (id) card(id).abilities++
    }
    o.onGame?.(g + 1)
  }
  return res
}

const pct = (w: number, n: number) => (n ? `${Math.round((100 * w) / n)}%` : '–')

export function report(r: SimResult): string {
  const names = Object.keys(r.decks)
  const lines: string[] = []
  const lv = r.options.levels.map((l) => BOT_NAMES[l])
  lines.push('# Adventure Scuffle balance run', '')
  lines.push(
    `${r.played} games, ${lv[0]} against ${lv[1]} bots${r.options.playouts ? ` (Hard: ${r.options.playouts} playouts)` : ''}, seed ${r.options.seed ?? 1}.`,
    '',
    `- Average length: ${(r.rounds / Math.max(1, r.played)).toFixed(1)} rounds, ${Math.round(r.moves / Math.max(1, r.played))} moves.`,
    `- The player with the first initiative won ${pct(r.firstWins, r.played - r.unfinished)} of games.`,
    `- Unfinished games: ${r.unfinished}. Problems found: ${r.problems.length}.`,
    '',
  )
  lines.push('## Decks', '', '| Deck | Games | Win rate |', '|---|---:|---:|')
  for (const n of [...names].sort(
    (a, b) => r.decks[b][1] / r.decks[b][0] - r.decks[a][1] / r.decks[a][0],
  ))
    lines.push(`| ${n} | ${r.decks[n][0]} | ${pct(r.decks[n][1], r.decks[n][0])} |`)
  lines.push(
    '',
    '## Deck against deck',
    '',
    'Win rate of the row deck against the column deck.',
    '',
  )
  lines.push(`| | ${names.join(' | ')} |`, `|---|${names.map(() => '---:').join('|')}|`)
  for (const a of names)
    lines.push(
      `| **${a}** | ${names.map((b) => (a === b ? '–' : pct(...r.matrix[a][b]))).join(' | ')} |`,
    )
  if (Object.keys(r.levels).length > 1) {
    lines.push('', '## Bot levels', '', '| Level | Games | Win rate |', '|---|---:|---:|')
    for (const [l, [n, w]] of Object.entries(r.levels)) lines.push(`| ${l} | ${n} | ${pct(w, n)} |`)
  }
  lines.push(
    '',
    '## Cards',
    '',
    'Win rate of the decks a card is in, how often it was revealed as Fighting Spirit, and how often its ability was used (per game it was in).',
    '',
    '| Card | Games | Win rate | Fighting Spirit / game | Ability / game |',
    '|---|---:|---:|---:|---:|',
  )
  const rows = Object.entries(r.cards).filter(([, c]) => c.games > 0)
  rows.sort(([, a], [, b]) => b.wins / b.games - a.wins / a.games)
  for (const [id, c] of rows)
    lines.push(
      `| ${r.cardNames[id] ?? id} | ${c.games} | ${pct(c.wins, c.games)} | ${(c.fs / c.games).toFixed(2)} | ${(c.abilities / c.games).toFixed(2)} |`,
    )
  if (r.problems.length) lines.push('', '## Problems', '', ...r.problems.map((p) => `- ${p}`))
  return lines.join('\n') + '\n'
}
