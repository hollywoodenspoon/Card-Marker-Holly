import { Play, Square } from '@/ui/icons'
import { useRef, useState } from 'react'
import type { AsCard } from '@/adventure/cards'
import {
  DEFAULT_ENTRANTS,
  ladderDecks,
  ladderReport,
  LADDER_ENTRANTS,
  rateText,
  runLadder,
  type LadderOptions,
} from '@/adventure/lab/ladder'
import { REVEAL_LABELS, REVEAL_RULES, type RevealRule } from '@/adventure/state'
import { saveSim, type LadderSimRow } from '@/playtest/library'
import { toast } from '@/ui/components/feedback'
import { Button } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { LADDER_MS, ladderExec } from './labClient'

/**
 * The Balance lab's Bot ladder mode: pick the bots, and every one plays every
 * other on the same decks and seeds. Ratings show which bot is stronger, and
 * by how much, and how long each thinks.
 */

const GAMES = [20, 100, 400]

export function LadderSetup({
  packId,
  packName,
  cards,
  premades,
  seed,
  threads,
  duration,
  onDone,
}: {
  packId: string
  packName: string
  cards: AsCard[]
  premades: { name: string; cards: string[] }[]
  seed: number
  threads: number
  duration: (ms: number) => string
  onDone: (row: LadderSimRow) => void
}) {
  const [entrants, setEntrants] = useState<string[]>(DEFAULT_ENTRANTS)
  const [games, setGames] = useState(100)
  const [reveal, setReveal] = useState<RevealRule>('classic')
  const [done, setDone] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [tick, setTick] = useState(0)
  const stop = useRef(false)
  const chosen = LADDER_ENTRANTS.filter((e) => entrants.includes(e.id))
  const pairs = (chosen.length * (chosen.length - 1)) / 2
  const total = pairs * games
  // Each pairing costs about the average of its two bots' game times.
  let cost = 0
  for (let a = 0; a < chosen.length; a++)
    for (let b = a + 1; b < chosen.length; b++)
      cost += (games * (LADDER_MS[chosen[a].id] + LADDER_MS[chosen[b].id])) / 2
  const estimate = cost / Math.max(1, threads)
  const decks = ladderDecks({ packName, cards, premades }, seed).length

  const start = async () => {
    stop.current = false
    const now = Date.now()
    setStartedAt(now)
    setTick(now)
    setDone(0)
    const options: LadderOptions = { entrants, games, seed, reveal }
    try {
      const result = await runLadder(
        { packName, cards, premades },
        options,
        ladderExec(
          threads,
          (n) => {
            setTick(Date.now())
            setDone(n)
          },
          () => stop.current,
        ),
        () => stop.current,
      )
      const row: LadderSimRow = {
        id: `ladder-${Date.now()}`,
        kind: 'ladder',
        packId,
        savedAt: Date.now(),
        ladder: result,
        report: ladderReport(result),
      }
      await saveSim(row)
      onDone(row)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setDone(null)
    }
  }

  if (done !== null) {
    const left = done > 0 ? ((tick - startedAt) * (total - done)) / done : estimate
    return (
      <section
        className="flex flex-col gap-3 rounded-xl border bg-panel p-3"
        data-testid="ladder-running"
      >
        <p className="text-sm">
          {done.toLocaleString()} of {total.toLocaleString()} games · about {duration(left)} left
        </p>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Bot ladder"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${(100 * done) / Math.max(1, total)}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Stop keeps what was played and rates it.</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => (stop.current = true)}
            data-testid="ladder-stop"
          >
            <Square /> Stop
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-panel p-3"
      data-testid="ladder-setup"
    >
      <p className="text-sm text-muted-foreground">
        Every bot you pick plays every other on the same decks and seeds, swapping seats: the pack's
        own decks plus random legal ones ({decks} decks). You get a rating for each bot, the win
        rate of every pairing, and how long each one thinks per move.
      </p>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Bots</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Bots">
          {LADDER_ENTRANTS.map((e) => {
            const on = entrants.includes(e.id)
            return (
              <Button
                key={e.id}
                size="sm"
                variant="outline"
                active={on}
                aria-pressed={on}
                onClick={() =>
                  setEntrants(on ? entrants.filter((x) => x !== e.id) : [...entrants, e.id])
                }
              >
                {e.name}
              </Button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Hard is MCTS; its number is the practice games per move (about{' '}
          {Math.round(LADDER_MS['hard-400'] / 1000)} s a game at 400). Quick is the lab's fast bot.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Games per pairing</span>
          <div className="flex gap-2" role="group" aria-label="Games per pairing">
            {GAMES.map((g) => (
              <Button
                key={g}
                size="sm"
                variant="outline"
                active={games === g}
                onClick={() => setGames(g)}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ladder-reveal">Reveal size</Label>
          <NativeSelect
            id="ladder-reveal"
            value={reveal}
            onChange={(e) => setReveal(e.target.value as RevealRule)}
            data-testid="ladder-reveal"
          >
            {REVEAL_RULES.map((r) => (
              <option key={r} value={r}>
                {REVEAL_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {pairs} pairings · {total.toLocaleString()} games · about {duration(estimate)} on {threads}{' '}
        thread{threads === 1 ? '' : 's'} (a rough guess; it updates once the run starts). The seed
        and threads are the ones below.
      </p>
      <Button onClick={() => void start()} disabled={chosen.length < 2} data-testid="ladder-start">
        <Play /> Start the ladder
      </Button>
    </section>
  )
}

export function LadderResults({ row }: { row: LadderSimRow }) {
  const r = row.ladder
  const order = r.rows.map((_, i) => i).sort((a, b) => r.rows[b].elo - r.rows[a].elo)
  const total = r.matrix.reduce((a, x) => a + x.reduce((b, c) => b + c[1], 0), 0) / 2
  return (
    <div className="flex flex-col gap-4" data-testid="ladder-results">
      <section className="rounded-xl border bg-panel p-3 text-sm">
        <p>
          {total.toLocaleString()} games{r.stopped ? ' (stopped early)' : ''}, {r.options.games} per
          pairing, {REVEAL_LABELS[r.options.reveal ?? 'classic'].toLowerCase()}, seed{' '}
          {r.options.seed}.
        </p>
        <p className="text-muted-foreground">
          Rules checker: {r.checked} games, {r.problems.length} problems. Ratings: Easy at 1000; 100
          points is about a 64% win rate, 200 about 76%.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Ratings</h3>
        <div className="overflow-x-auto rounded-xl border bg-panel">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="p-2 text-left font-medium">Bot</th>
                <th className="p-2 text-right font-medium">Rating</th>
                <th className="p-2 text-right font-medium">Win rate</th>
                <th className="p-2 text-right font-medium">Games</th>
                <th className="p-2 text-right font-medium">Per move</th>
              </tr>
            </thead>
            <tbody>
              {order.map((i) => {
                const x = r.rows[i]
                return (
                  <tr key={x.id} className="border-b last:border-0">
                    <td className="p-2">{x.name}</td>
                    <td className="p-2 text-right font-semibold tabular-nums">{x.elo}</td>
                    <td className="p-2 text-right tabular-nums">{rateText(x.wins, x.games)}</td>
                    <td className="p-2 text-right tabular-nums">{x.games}</td>
                    <td className="p-2 text-right tabular-nums">{x.msPerMove.toFixed(1)} ms</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Pairings</h3>
        <p className="text-xs text-muted-foreground">
          Win rate of the row bot against the column bot, with a 95% margin.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-panel">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="p-2" />
                {order.map((j) => (
                  <th key={j} className="p-2 text-right font-medium">
                    {r.rows[j].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.map((i) => (
                <tr key={i} className="border-b last:border-0">
                  <th className="p-2 text-left font-medium">{r.rows[i].name}</th>
                  {order.map((j) => (
                    <td key={j} className="p-2 text-right tabular-nums">
                      {i === j ? '–' : rateText(...r.matrix[i][j])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {r.problems.length > 0 && (
        <section className="flex flex-col gap-1 text-sm">
          <h3 className="font-semibold">Problems</h3>
          <ul className="list-disc pl-5 text-xs">
            {r.problems.slice(0, 20).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
