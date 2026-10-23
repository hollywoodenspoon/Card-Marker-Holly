import { rarelyUsed, type CardRow, type LabView } from './analyze'
import type { AsCard } from '../cards'
import { STAGE_NAMES, type LabResult, type LabStage } from './run'

/** The Balance lab's results as Markdown (for Copy report and the results file). */

const pct = (w: number, n: number) => (n ? `${Math.round((100 * w) / n)}%` : '–')
const num = (x: number) => (x >= 0 ? `+${x.toFixed(2)}` : x.toFixed(2))
/** The lab's bots by what they are ('normal' is the Tricks bot, the table's Easy since v0.2.0). */
export const BOTS = { quick: 'Quick', normal: 'Tricks' } as const
/** Fewer games than this: the values are rough. */
export const SMALL_RUN = 5000

function cardTable(v: LabView): string[] {
  const full = !!v.coreRange
  const out = [
    `| Card | Code | Tier | Value | Win rate with it | Picked (Optimal) | FS / game | Ability / game | Band${full ? ' | Closest core card' : ''} |`,
    `|---|---|---|---:|---:|---:|---:|---:|---${full ? '|---' : ''}|`,
  ]
  const band = (r: CardRow) =>
    r.creep ? 'power creep' : r.band === 'ok' ? '' : r.band === 'strong' ? 'too strong' : 'too weak'
  for (const r of v.cards)
    out.push(
      `| ${r.core && full ? `**${r.name}**` : r.name} | ${r.code} | ${r.tier} | ${num(r.value)} | ${pct(r.wins, r.games)} | ${pct(r.picks, r.available)} | ${r.fs.toFixed(2)} | ${r.abilities.toFixed(2)} | ${band(r)}${full ? ` | ${r.closest ? `${r.closest.name} (${num(r.closest.value)})` : ''}` : ''} |`,
    )
  return out
}

export function labReport(r: LabResult, cards: AsCard[]): string {
  const name = Object.fromEntries(cards.map((c) => [c.id, c.name]))
  const total = Object.values(r.played).reduce((a, b) => a + b, 0)
  const L: string[] = []
  L.push(`# Balance lab: ${r.packName}`, '')
  L.push(
    `${total} games${r.stopped ? ' (stopped early)' : ''}, ${BOTS[r.options.bot]} bots, seed ${r.options.seed}, ${Math.round(r.seconds)} s.`,
    `Core set: ${r.options.core.join(', ') || 'none'} (${r.coreCount} of ${r.cardCount} cards).`,
    '',
    ...(Object.keys(r.played) as LabStage[]).map(
      (s) => `- ${STAGE_NAMES[s]}: ${r.played[s]} games.`,
    ),
    `- Average length: ${(r.rounds / Math.max(1, total)).toFixed(1)} rounds. The player with the first initiative won ${pct(r.firstWins, r.decided)}.`,
    `- Rules checker: ${r.checked} games checked, ${r.problems.length} problems.`,
    '',
    ...(total < SMALL_RUN
      ? [
          '**A small run: the values are rough.** Use Standard or Overnight before changing cards.',
          '',
        ]
      : []),
    'The goal is a decent play rate for every card, not perfect balance. Value is in log-odds of winning (0 is an average card in that view). "Picked" is how often the auto-builder put the card in an Optimal deck when it could.',
    '',
  )
  L.push('## Suggestions', '')
  if (!r.suggestions.length) L.push('Nothing stands out.', '')
  const ranks = { 1: 'Core set', 2: 'Breaks the game in the full pool', 3: 'The rest' }
  for (const rank of [1, 2, 3] as const) {
    const list = r.suggestions.filter((s) => s.rank === rank)
    if (!list.length) continue
    L.push(`### ${rank}. ${ranks[rank]}`, '')
    for (const s of list) {
      L.push(`- ${s.text}`)
      for (const o of s.options) L.push(`  - ${o}`)
    }
    L.push('')
  }
  for (const v of r.views) {
    L.push(`## ${v.title}`, '')
    L.push(`League: ${v.decks} random decks, ${v.games} games.`)
    if (v.coreRange)
      L.push(
        `Core set range: ${num(v.coreRange.low)} to ${num(v.coreRange.high)} (10th to 90th percentile), top ${num(v.coreRange.max)}. Core cards in **bold**.`,
      )
    L.push('', ...cardTable(v), '')
    if (v.pairs.length) {
      L.push(
        '### Pairs that win more together',
        '',
        '| Cards | Decks | Games | Above prediction | Together in Optimal |',
        '|---|---:|---:|---:|---:|',
      )
      for (const p of v.pairs)
        L.push(
          `| ${name[p.a]} + ${name[p.b]} | ${p.decks} | ${p.games} | ${pct(p.over, 1)} | ${p.both ? `${p.together} of ${p.both}` : '–'} |`,
        )
      L.push('')
    }
    const rare = rarelyUsed(v, cards)
    if (rare.length)
      L.push(
        '### Rarely used abilities',
        '',
        'The ability came up in under 3% of its games. Check that its condition can happen, or that the bots see it.',
        '',
        ...rare.map((x) => `- ${x.name} (${x.abilities.toFixed(2)} per game)`),
        '',
      )
    if (v.constructed.decks.length) {
      L.push(
        '### Constructed',
        '',
        `${v.constructed.games} games between auto-built decks${v.constructed.decks.some((d) => d.kind === 'premade') ? ' and the premades' : ''}.`,
        '',
        '| Deck | Games | Win rate | As first player | Rounds | Cards |',
        '|---|---:|---:|---:|---:|---|',
      )
      for (const d of [...v.constructed.decks].sort(
        (a, b) => b.wins / (b.games || 1) - a.wins / (a.games || 1),
      ))
        L.push(
          `| ${d.name} | ${d.games} | ${pct(d.wins, d.games)} | ${pct(d.firstWins, d.firstGames)} | ${d.games ? (d.rounds / d.games).toFixed(1) : '–'} | ${d.kind === 'premade' ? '' : d.cards.map((id) => name[id] ?? id).join(', ')} |`,
        )
      L.push('')
    }
  }
  if (r.premades) {
    const p = r.premades
    L.push(
      '## Premade decks',
      '',
      '| Deck | Games | Win rate | As first player | Rounds |',
      '|---|---:|---:|---:|---:|',
    )
    for (const d of [...p.decks].sort((a, b) => b.wins / (b.games || 1) - a.wins / (a.games || 1)))
      L.push(
        `| ${d.name} | ${d.games} | ${pct(d.wins, d.games)} | ${pct(d.firstWins, d.firstGames)} | ${d.games ? (d.rounds / d.games).toFixed(1) : '–'} |`,
      )
    const names = p.decks.map((d) => d.name)
    L.push('', 'Win rate of the row deck against the column deck.', '')
    L.push(`| | ${names.join(' | ')} |`, `|---|${names.map(() => '---:').join('|')}|`)
    names.forEach((a, i) =>
      L.push(
        `| **${a}** | ${names.map((_, j) => (i === j ? '–' : pct(...p.matrix[i][j]))).join(' | ')} |`,
      ),
    )
    L.push('')
  }
  if (r.problems.length) L.push('## Problems', '', ...r.problems.map((x) => `- ${x}`), '')
  return L.join('\n')
}
