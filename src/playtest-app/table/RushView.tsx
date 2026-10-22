import { ArrowLeft, Copy, Eye, Pin, Square } from '@/ui/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BOT_NAMES } from '@/adventure/bot'
import type { NewGame } from '@/adventure/engine'
import { randomSeed } from '@/playtest/rng'
import { saveReplay, saveRush, type RushMatch, type RushRow } from '@/playtest/library'
import { toast } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import { runRush } from './rushClient'
import { pct, rushGameOf, rushReport, rushTally, type RushRun } from './rushTally'

/**
 * Rush: many bot games as fast as the device allows, nothing drawn. A live
 * tally, then every match can be watched as a replay (or kept with the
 * replays). Opened with `run` it plays a new batch; with `row`, it shows a saved one.
 */
export function RushView({
  run,
  row: savedRow,
  onClose,
  onWatch,
}: {
  run?: RushRun
  row?: RushRow
  onClose: () => void
  /** `back`: the batch as saved, to come back to after the replay (not a new run). */
  onWatch: (game: NewGame, moves: RushMatch['moves'], title: string, back: RushRow) => void
}) {
  const [row, setRow] = useState<RushRow>(
    () =>
      savedRow ?? {
        id: `rush-${Date.now()}`,
        packId: run!.packId,
        savedAt: Date.now(),
        decks: run!.decks,
        levels: run!.levels,
        games: run!.games,
        cards: run!.cards,
        uses: {},
        matches: [],
      },
  )
  const [running, setRunning] = useState(!savedRow)
  // The latest tally, for saving from the stop handler.
  const rowRef = useRef(row)
  useEffect(() => {
    rowRef.current = row
  })
  /** Stops the batch early (it is saved as it stands). */
  const stopRef = useRef<(() => void) | null>(null)
  // Set when the batch ends (true: stopped early); the effect below saves it.
  const [ended, setEnded] = useState<boolean | null>(null)

  useEffect(() => {
    if (savedRow || !run) return
    const finish = (stopped: boolean) => {
      setRunning(false)
      setEnded(stopped)
    }
    const halt = runRush(
      {
        cards: run.cards,
        decks: [run.decks[0].cards, run.decks[1].cards],
        names: [run.decks[0].name, run.decks[1].name],
        levels: run.levels,
        seed: randomSeed(),
      },
      run.games,
      (g) =>
        setRow((r) => {
          const uses = { ...r.uses }
          for (const [k, v] of Object.entries(g.uses)) {
            const was = uses[k] ?? [0, 0]
            uses[k] = [was[0] + v[0], was[1] + v[1]]
          }
          const m: RushMatch = {
            seed: g.seed,
            seats: g.seats,
            levels: g.levels,
            moves: g.match.moves,
            winner: g.match.winner,
            first: g.match.first,
            points: g.match.points,
            rounds: g.match.rounds,
            ...(g.match.problem && { problem: g.match.problem }),
          }
          return { ...r, uses, matches: [...r.matches, m] }
        }),
      () => finish(false),
    )
    stopRef.current = () => {
      halt()
      stopRef.current = null
      // Saved here too: Back stops the batch and closes the view at once, before
      // the effect below would run.
      void saveRush({ ...rowRef.current, savedAt: Date.now(), stopped: true })
      finish(true)
    }
    return halt
    // A batch runs once, for the options it was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (ended === null) return
    void saveRush({ ...row, savedAt: Date.now(), stopped: ended })
    // Saved once, when the batch ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended])
  const shown = ended ? { ...row, stopped: true } : row
  const t = useMemo(() => rushTally(row), [row])
  const sorted = useMemo(() => [...row.matches].sort((a, b) => a.seed - b.seed), [row.matches])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rushReport(shown))
      toast('Rush report copied.')
    } catch {
      toast('Could not copy the report.')
    }
  }
  const keep = async (m: RushMatch) => {
    const g = rushGameOf(row, m)
    await saveReplay({
      id: `rush-${m.seed}`,
      packId: row.packId,
      source: 'rush',
      names: g.names,
      decks: [row.decks[m.seats[0]].name, row.decks[m.seats[1]].name],
      bots: m.levels,
      winner: m.winner,
      points: m.points,
      rounds: m.rounds,
      game: g,
      moves: m.moves,
      pinned: true,
    })
    toast('Kept with your replays (pinned).')
  }
  const [a, b] = row.decks
  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-40 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Rush"
      data-testid="rush-view"
    >
      <header className="app-topbar flex shrink-0 items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton
          label="Back"
          onClick={() => {
            // Leaving stops a running batch; what it played so far is kept.
            stopRef.current?.()
            onClose()
          }}
        >
          <ArrowLeft />
        </IconButton>
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">
          Rush: {a.name} vs {b.name}
        </div>
        {running ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => stopRef.current?.()}
            data-testid="rush-stop"
          >
            <Square /> Stop
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => void copy()}>
            <Copy /> Copy report
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>
                {t.played} of {row.games} games
                {shown.stopped ? ' (stopped)' : running ? '…' : ''}
              </span>
              <span className="text-muted-foreground">
                {BOT_NAMES[row.levels[0]]} vs {BOT_NAMES[row.levels[1]]} · average{' '}
                {t.avgRounds.toFixed(1)} rounds
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={row.games}
              aria-valuenow={t.played}
            >
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${(100 * t.played) / Math.max(1, row.games)}%` }}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2" data-testid="rush-tally">
            {row.decks.map((d, i) => (
              <div key={i} className="rounded-xl border bg-panel p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{d.name}</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {pct(t.wins[i], t.played)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t.wins[i]} wins · {t.firstWins[i]} as first player
                </p>
                <p className="mt-2 text-xs">
                  <span className="font-medium">Fighting Spirit:</span>{' '}
                  {t.fs[i].map((x) => `${x.name} (${x.n})`).join(', ') || '–'}
                </p>
                <p className="text-xs">
                  <span className="font-medium">Abilities:</span>{' '}
                  {t.abilities[i].map((x) => `${x.name} (${x.n})`).join(', ') || '–'}
                </p>
              </div>
            ))}
          </div>
          {t.ties > 0 && <p className="text-xs text-muted-foreground">No winner: {t.ties}.</p>}
          {t.problems.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-danger">
              {t.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <h3 className="text-sm font-semibold">Matches</h3>
          <ul className="flex flex-col gap-1" data-testid="rush-matches">
            {sorted.map((m, n) => {
              const g = rushGameOf(row, m)
              const won = m.winner === null ? null : row.decks[m.seats[m.winner]].name
              return (
                <li
                  key={m.seed}
                  className="flex min-h-11 items-center gap-2 rounded-lg border bg-panel px-2"
                >
                  <span className="w-8 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {n + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {won ? `${won} wins` : 'No winner'}{' '}
                    <span className="text-muted-foreground tabular-nums">
                      {/* The winner's points first. */}
                      {m.winner === 1
                        ? `${m.points[1]}–${m.points[0]}`
                        : `${m.points[0]}–${m.points[1]}`}{' '}
                      · {m.rounds} rounds · {row.decks[m.seats[0]].name} as Player 1
                    </span>
                  </span>
                  <IconButton
                    label="Keep with your replays"
                    onClick={() => void keep(m)}
                    disabled={running}
                  >
                    <Pin />
                  </IconButton>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={running}
                    onClick={() =>
                      onWatch(g, m.moves, `${g.names[0]} vs ${g.names[1]} (Rush ${n + 1})`, shown)
                    }
                    data-testid="rush-watch"
                  >
                    <Eye /> Watch
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
