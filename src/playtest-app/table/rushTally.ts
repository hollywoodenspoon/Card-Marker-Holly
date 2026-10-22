import { BOT_NAMES, type BotLevel } from '@/adventure/bot'
import type { AsCard } from '@/adventure/cards'
import type { NewGame } from '@/adventure/engine'
import type { RushMatch, RushRow } from '@/playtest/library'

export interface RushRun {
  packId: string
  cards: AsCard[]
  decks: RushRow['decks']
  levels: [BotLevel, BotLevel]
  games: number
}

/** How a Rush batch stands: wins and first-player wins per deck, rounds, card use. */
export function rushTally(row: Pick<RushRow, 'decks' | 'matches' | 'uses' | 'cards'>) {
  const wins: [number, number] = [0, 0]
  const firstWins: [number, number] = [0, 0]
  let ties = 0
  let rounds = 0
  const problems: string[] = []
  for (const m of row.matches) {
    rounds += m.rounds
    if (m.problem) problems.push(`Seed ${m.seed}: ${m.problem}`)
    if (m.winner === null) ties++
    else wins[m.seats[m.winner]]++
  }
  for (const m of row.matches)
    if (m.winner !== null && m.first === m.winner) firstWins[m.seats[m.winner]]++
  const names = new Map(row.cards.map((c) => [c.id, c.name]))
  const top = (deck: 0 | 1, k: 0 | 1) =>
    Object.entries(row.uses)
      .filter(([key, v]) => key.startsWith(`${deck}:`) && v[k] > 0)
      .sort((a, b) => b[1][k] - a[1][k])
      .slice(0, 5)
      .map(([key, v]) => ({ name: names.get(key.slice(2)) ?? key, n: v[k] }))
  return {
    played: row.matches.length,
    wins,
    firstWins,
    ties,
    avgRounds: row.matches.length ? rounds / row.matches.length : 0,
    problems,
    fs: [top(0, 0), top(1, 0)],
    abilities: [top(0, 1), top(1, 1)],
  }
}

export const pct = (n: number, of: number) => (of ? `${Math.round((100 * n) / of)}%` : '–')

export function rushReport(row: RushRow): string {
  const t = rushTally(row)
  const [a, b] = row.decks
  const lines = [
    `# Rush: ${a.name} vs ${b.name}`,
    '',
    `${t.played} games${row.stopped ? ' (stopped early)' : ''}, ${BOT_NAMES[row.levels[0]]} bot vs ${BOT_NAMES[row.levels[1]]} bot, seats swapped every other game. Average ${t.avgRounds.toFixed(1)} rounds.`,
    '',
    '| Deck | Wins | Win rate | Wins as first player |',
    '|---|---|---|---|',
    ...row.decks.map(
      (d, i) => `| ${d.name} | ${t.wins[i]} | ${pct(t.wins[i], t.played)} | ${t.firstWins[i]} |`,
    ),
    '',
    `No winner: ${t.ties}.`,
  ]
  row.decks.forEach((d, i) => {
    lines.push('', `## ${d.name}`, '')
    lines.push(
      `Most used for Fighting Spirit: ${t.fs[i].map((x) => `${x.name} (${x.n})`).join(', ') || 'none'}.`,
    )
    lines.push(
      `Most used abilities: ${t.abilities[i].map((x) => `${x.name} (${x.n})`).join(', ') || 'none'}.`,
    )
  })
  if (t.problems.length) lines.push('', '## Problems', '', ...t.problems.map((p) => `- ${p}`))
  return lines.join('\n')
}

/** The start and moves of one Rush match, for its replay. */
export function rushGameOf(row: RushRow, m: RushMatch): NewGame {
  return {
    cards: row.cards,
    decks: [row.decks[m.seats[0]].cards, row.decks[m.seats[1]].cards],
    names: [
      `${row.decks[m.seats[0]].name} (${BOT_NAMES[m.levels[0]]} bot)`,
      `${row.decks[m.seats[1]].name} (${BOT_NAMES[m.levels[1]]} bot)`,
    ],
    seed: m.seed,
  }
}
