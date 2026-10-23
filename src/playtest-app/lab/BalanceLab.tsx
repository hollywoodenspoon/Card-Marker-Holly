import { ArrowLeft, Copy, Dices, Download, FlaskConical, Play, Square, Trash2 } from '@/ui/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AsCard } from '@/adventure/cards'
import type { CardRow, LabView, Suggestion } from '@/adventure/lab/analyze'
import type { LabBot } from '@/adventure/lab/play'
import { BOTS, labReport, SMALL_RUN } from '@/adventure/lab/report'
import {
  labPlan,
  prefixes,
  runLab,
  STAGE_NAMES,
  type LabOptions,
  type LabResult,
  type LabStage,
} from '@/adventure/lab/run'
import { deleteSim, listSims, saveSim, type BalanceSimRow, type SimRow } from '@/playtest/library'
import { randomSeed } from '@/playtest/rng'
import { cn } from '@/lib/cn'
import { askConfirm, toast } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { maxThreads } from '../workerPool'
import { LadderResults, LadderSetup } from './Ladder'
import { exportLadder, exportSim, labExec, MS_PER_GAME } from './labClient'

/**
 * The Balance lab: no decks to pick. It builds its own decks, tests every
 * card in the pack, and reports values, tiers, play rates and ranked
 * suggestions, with the core set (TFQ) first.
 */

const PRESETS = [
  { name: 'Quick check', games: 2000 },
  { name: 'Standard', games: 10000 },
  { name: 'Overnight', games: 100000 },
]
const STAGES: LabStage[] = ['cards', 'constructed', 'premades']

const coreKey = (packId: string) => `hs-lab-core:${packId}`
function loadCore(packId: string, found: string[]): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(coreKey(packId)) ?? 'null') as unknown
    if (Array.isArray(v)) return v.filter((p): p is string => typeof p === 'string')
  } catch {
    /* storage unavailable */
  }
  return found.includes('TFQ') ? ['TFQ'] : []
}
function saveCore(packId: string, core: string[]) {
  try {
    localStorage.setItem(coreKey(packId), JSON.stringify(core))
  } catch {
    /* storage unavailable */
  }
}

const pct = (w: number, n: number) => (n ? `${Math.round((100 * w) / n)}%` : '–')
const num = (x: number) => (x >= 0 ? `+${x.toFixed(2)}` : x.toFixed(2))
function duration(ms: number) {
  const s = Math.max(1, Math.round(ms / 1000))
  if (s < 90) return `${s} s`
  const m = Math.round(s / 60)
  return m < 90 ? `${m} min` : `${(m / 60).toFixed(1)} h`
}

export function BalanceLab({
  packId,
  packName,
  cards,
  premades,
  onClose,
}: {
  packId: string
  packName: string
  cards: AsCard[]
  premades: { name: string; cards: string[] }[]
  onClose: () => void
}) {
  const found = useMemo(() => prefixes(cards), [cards])
  const [games, setGames] = useState(10000)
  const [bot, setBot] = useState<LabBot>('quick')
  const [seed, setSeed] = useState(() => randomSeed())
  const [threads, setThreads] = useState(maxThreads)
  const [core, setCore] = useState(() =>
    loadCore(
      packId,
      found.map(([p]) => p),
    ),
  )
  const [mode, setMode] = useState<'balance' | 'ladder'>('balance')
  const [saved, setSaved] = useState<SimRow[]>([])
  const [open, setOpen] = useState<SimRow | null>(null)
  const [progress, setProgress] = useState<Record<LabStage, number> | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  // When progress last came in (for the time left).
  const [tick, setTick] = useState(0)
  const stop = useRef(false)

  useEffect(() => {
    void listSims(packId).then(setSaved)
  }, [packId, open])

  const options: LabOptions = { games, bot, seed, core }
  const plan = useMemo(
    () => labPlan({ packName, cards, premades }, { games, core }),
    [packName, cards, premades, games, core],
  )
  const estimate = (games * MS_PER_GAME[bot] * 1.05) / Math.max(1, threads)
  const running = progress !== null

  const start = async () => {
    stop.current = false
    const now = Date.now()
    setStartedAt(now)
    setTick(now)
    setProgress({ cards: 0, constructed: 0, premades: 0 })
    try {
      const result = await runLab(
        { packName, cards, premades },
        options,
        labExec(
          threads,
          (stage, n) => {
            setTick(Date.now())
            setProgress((p) => (p ? { ...p, [stage]: n } : p))
          },
          () => stop.current,
        ),
        () => stop.current,
      )
      const row: BalanceSimRow = {
        id: `sim-${Date.now()}`,
        packId,
        savedAt: Date.now(),
        result,
        report: labReport(result, cards),
      }
      await saveSim(row)
      setOpen(row)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setProgress(null)
    }
  }

  const done = progress ? STAGES.reduce((a, s) => a + progress[s], 0) : 0
  const left = done > 0 ? ((tick - startedAt) * (games - done)) / done : estimate

  const seedField = (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="lab-seed">Seed</Label>
      <div className="flex gap-1">
        <Input
          id="lab-seed"
          type="number"
          value={seed}
          onChange={(e) => setSeed(Number(e.target.value) >>> 0)}
        />
        <IconButton label="New seed" onClick={() => setSeed(randomSeed())}>
          <Dices />
        </IconButton>
      </div>
    </div>
  )
  const threadsField = (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="lab-threads">Threads (of {maxThreads()})</Label>
      <Input
        id="lab-threads"
        type="number"
        min={1}
        max={maxThreads()}
        value={threads}
        onChange={(e) =>
          setThreads(Math.max(1, Math.min(maxThreads(), Math.round(Number(e.target.value) || 1))))
        }
      />
    </div>
  )

  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-40 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Balance lab"
      data-testid="balance-lab"
    >
      <header className="app-topbar flex shrink-0 items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton
          label="Back"
          onClick={() => {
            if (open) return setOpen(null)
            // Leaving stops a run; what it played so far is kept.
            stop.current = true
            onClose()
          }}
        >
          <ArrowLeft />
        </IconButton>
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">
          Balance lab{open ? `: ${new Date(open.savedAt).toLocaleString()}` : ''}
        </div>
        {running && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => (stop.current = true)}
            data-testid="lab-stop"
          >
            <Square /> Stop
          </Button>
        )}
        {open && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(open.report)
                  .then(() => toast('Report copied.'))
                  .catch(() => toast('Could not copy the report.'))
              }
            >
              <Copy /> <span className="hidden sm:inline">Copy report</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                open.kind === 'ladder'
                  ? exportLadder(open.ladder, open.report)
                  : exportSim(open.result, open.report)
              }
              data-testid="lab-save"
            >
              <Download /> <span className="hidden sm:inline">Save results</span>
            </Button>
          </>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {open ? (
            open.kind === 'ladder' ? (
              <LadderResults row={open} />
            ) : (
              <Results row={open} cards={cards} />
            )
          ) : running ? (
            <section className="flex flex-col gap-3 rounded-xl border bg-panel p-3">
              <p className="text-sm">
                {done.toLocaleString()} of {games.toLocaleString()} games · about {duration(left)}{' '}
                left
              </p>
              {STAGES.filter((s) => plan.budget[s] > 0).map((s) => (
                <div key={s} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span>{STAGE_NAMES[s]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {progress[s].toLocaleString()} / {plan.budget[s].toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={STAGE_NAMES[s]}
                    aria-valuemin={0}
                    aria-valuemax={plan.budget[s]}
                    aria-valuenow={progress[s]}
                  >
                    <div
                      className="h-full bg-accent transition-[width]"
                      style={{ width: `${(100 * progress[s]) / Math.max(1, plan.budget[s])}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Stop keeps what was played and reports on it.
              </p>
            </section>
          ) : (
            <>
              <div className="flex gap-2" role="group" aria-label="Lab mode">
                <Button
                  size="sm"
                  variant="outline"
                  active={mode === 'balance'}
                  aria-pressed={mode === 'balance'}
                  onClick={() => setMode('balance')}
                  data-testid="lab-mode-balance"
                >
                  Card balance
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  active={mode === 'ladder'}
                  aria-pressed={mode === 'ladder'}
                  onClick={() => setMode('ladder')}
                  data-testid="lab-mode-ladder"
                >
                  Bot ladder
                </Button>
              </div>
              {mode === 'ladder' && (
                <LadderSetup
                  packId={packId}
                  packName={packName}
                  cards={cards}
                  premades={premades}
                  seed={seed}
                  threads={threads}
                  duration={duration}
                  onDone={setOpen}
                />
              )}
              {mode === 'ladder' && (
                <section className="grid gap-3 rounded-xl border bg-panel p-3 sm:grid-cols-2">
                  {seedField}
                  {threadsField}
                </section>
              )}
              {mode === 'balance' && (
                <section className="flex flex-col gap-3 rounded-xl border bg-panel p-3">
                  <p className="text-sm text-muted-foreground">
                    The lab builds its own decks and tests every card in the pack: random decks that
                    hold every card equally often, then auto-built Optimal and Suboptimal decks
                    {plan.premades.length ? ', then the pack’s own decks' : ''}. The core set is
                    tested alone and as the baseline for every other card.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lab-games">Games</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESETS.map((p) => (
                        <Button
                          key={p.name}
                          size="sm"
                          variant="outline"
                          active={games === p.games}
                          onClick={() => setGames(p.games)}
                        >
                          {p.name} ({p.games.toLocaleString()})
                        </Button>
                      ))}
                    </div>
                    <Input
                      id="lab-games"
                      type="number"
                      min={100}
                      step={100}
                      value={games}
                      onChange={(e) =>
                        setGames(Math.max(100, Math.round(Number(e.target.value) || 0)))
                      }
                      data-testid="lab-games"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="lab-bot">Bots</Label>
                      <NativeSelect
                        id="lab-bot"
                        value={bot}
                        onChange={(e) => setBot(e.target.value as LabBot)}
                      >
                        <option value="quick">Quick (fast, for big runs)</option>
                        <option value="normal">
                          Tricks (slower, plays better; the table&apos;s Easy)
                        </option>
                      </NativeSelect>
                    </div>
                    {seedField}
                    {threadsField}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Core set</span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Core set">
                      {found.map(([p, n]) => (
                        <Button
                          key={p}
                          size="sm"
                          variant="outline"
                          active={core.includes(p)}
                          aria-pressed={core.includes(p)}
                          onClick={() => {
                            const next = core.includes(p)
                              ? core.filter((x) => x !== p)
                              : [...core, p]
                            setCore(next)
                            saveCore(packId, next)
                          }}
                        >
                          {p} ({n})
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.coreCards.length
                        ? `${plan.coreCards.length} core cards: balanced first, and the baseline for the rest.`
                        : 'No core set: every card is weighed against the whole pool.'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {STAGES.filter((s) => plan.budget[s] > 0)
                      .map((s) => `${STAGE_NAMES[s]}: ${plan.budget[s].toLocaleString()}`)
                      .join(' · ')}
                    {' · '}about {duration(estimate)} on {threads} thread{threads === 1 ? '' : 's'}{' '}
                    (a rough guess; it updates once the run starts).
                  </p>
                  <Button onClick={() => void start()} data-testid="lab-start">
                    <Play /> Start
                  </Button>
                </section>
              )}
              {saved.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">Earlier runs</h3>
                  <ul className="flex flex-col gap-1">
                    {saved.map((r) => (
                      <li
                        key={r.id}
                        className="flex min-h-11 items-center gap-2 rounded-lg border bg-panel px-2"
                      >
                        <FlaskConical className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {new Date(r.savedAt).toLocaleString()}{' '}
                          <span className="text-muted-foreground">
                            ·{' '}
                            {r.kind === 'ladder'
                              ? `bot ladder, ${r.ladder.rows.length} bots`
                              : `${Object.values(r.result.played)
                                  .reduce((a, b) => a + b, 0)
                                  .toLocaleString()} games, ${BOTS[r.result.options.bot]}`}
                            {(r.kind === 'ladder' ? r.ladder.stopped : r.result.stopped)
                              ? ', stopped'
                              : ''}
                          </span>
                        </span>
                        <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>
                          Open
                        </Button>
                        <IconButton
                          label="Delete this run"
                          onClick={() =>
                            void askConfirm({
                              title: 'Delete this run?',
                              okLabel: 'Delete',
                              danger: true,
                            }).then(async (ok) => {
                              if (!ok) return
                              await deleteSim(r.id)
                              setSaved(await listSims(packId))
                            })
                          }
                        >
                          <Trash2 />
                        </IconButton>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const RANKS: Record<Suggestion['rank'], string> = {
  1: 'Core set',
  2: 'Breaks the game in the full pool',
  3: 'The rest',
}

function Results({ row, cards }: { row: BalanceSimRow; cards: AsCard[] }) {
  const r: LabResult = row.result
  const [view, setView] = useState(0)
  const v = r.views[Math.min(view, r.views.length - 1)]
  const total = Object.values(r.played).reduce((a, b) => a + b, 0)
  const name = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c.name])), [cards])
  return (
    <div className="flex flex-col gap-4" data-testid="lab-results">
      <section className="rounded-xl border bg-panel p-3 text-sm">
        <p>
          {total.toLocaleString()} games{r.stopped ? ' (stopped early)' : ''}, {BOTS[r.options.bot]}{' '}
          bots, seed {r.options.seed}, {duration(r.seconds * 1000)}.
        </p>
        <p className="text-muted-foreground">
          Core set: {r.options.core.join(', ') || 'none'} ({r.coreCount} of {r.cardCount} cards).
          First player won {pct(r.firstWins, r.decided)}. Rules checker: {r.checked} games,{' '}
          {r.problems.length} problems.
        </p>
        {total < SMALL_RUN && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            A small run: the values are rough. Use Standard or Overnight before changing cards.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2" data-testid="lab-suggestions">
        <h3 className="text-sm font-semibold">Suggestions</h3>
        {r.suggestions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing stands out.</p>
        )}
        {([1, 2, 3] as const).map((rank) => {
          const list = r.suggestions.filter((s) => s.rank === rank)
          if (!list.length) return null
          return (
            <div key={rank} className="flex flex-col gap-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                {rank}. {RANKS[rank]}
              </h4>
              {list.map((s, i) => (
                <details key={i} className="rounded-lg border bg-panel px-3 py-2 text-sm">
                  <summary className="min-h-7 cursor-pointer">{s.text}</summary>
                  <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                    {s.options.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )
        })}
      </section>

      {r.views.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Views">
          {r.views.map((x, i) => (
            <Button
              key={x.id}
              size="sm"
              variant="outline"
              role="tab"
              aria-selected={i === view}
              active={i === view}
              onClick={() => setView(i)}
            >
              {x.title}
            </Button>
          ))}
        </div>
      )}
      <ViewTables v={v} name={name} />

      {r.premades && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Premade decks</h3>
          <div className="overflow-x-auto rounded-xl border bg-panel">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2" />
                  {r.premades.decks.map((d) => (
                    <th key={d.name} className="p-2 font-medium">
                      {d.name}
                    </th>
                  ))}
                  <th className="p-2 font-medium">All</th>
                </tr>
              </thead>
              <tbody>
                {r.premades.decks.map((d, i) => (
                  <tr key={d.name} className="border-b last:border-0">
                    <th className="p-2 text-left font-medium whitespace-nowrap">{d.name}</th>
                    {r.premades!.decks.map((_, j) => (
                      <td key={j} className="p-2">
                        {i === j ? '–' : pct(...r.premades!.matrix[i][j])}
                      </td>
                    ))}
                    <td className="p-2 font-semibold">{pct(d.wins, d.games)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Win rate of the row deck against the column deck.
          </p>
        </section>
      )}

      {r.problems.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-danger">Problems</h3>
          <ul className="list-disc pl-5 text-xs text-danger">
            {r.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

const bandLabel = (c: CardRow) =>
  c.creep ? 'Power creep' : c.band === 'strong' ? 'Too strong' : c.band === 'weak' ? 'Too weak' : ''

function ViewTables({ v, name }: { v: LabView; name: Record<string, string> }) {
  return (
    <section className="flex flex-col gap-3" data-testid="lab-view">
      <p className="text-xs text-muted-foreground">
        {v.title}: {v.decks} random decks, {v.games.toLocaleString()} league games.
        {v.coreRange &&
          ` Core cards range from ${num(v.coreRange.low)} to ${num(v.coreRange.high)} (top ${num(v.coreRange.max)}); core cards are in bold.`}{' '}
        Value is how much a card adds to a deck's chance to win (0 is average); Picked is how often
        the auto-builder put it in an Optimal deck when it could.
      </p>
      <div className="max-h-[60dvh] overflow-auto rounded-xl border bg-panel">
        <table className="w-full text-xs tabular-nums" data-testid="lab-cards">
          <thead className="sticky top-0 bg-panel">
            <tr className="border-b text-left">
              <th className="p-2 font-medium">Card</th>
              <th className="p-2 font-medium">Tier</th>
              <th className="p-2 font-medium">Value</th>
              <th className="p-2 font-medium">Win %</th>
              <th className="p-2 font-medium">Picked</th>
              <th className="p-2 font-medium">Uses</th>
              <th className="p-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {v.cards.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td
                  className={cn('p-2 whitespace-nowrap', c.core && v.coreRange && 'font-semibold')}
                >
                  {c.name} <span className="text-muted-foreground">{c.code}</span>
                </td>
                <td className="p-2">{c.tier}</td>
                <td className="p-2">{num(c.value)}</td>
                <td className="p-2">{pct(c.wins, c.games)}</td>
                <td className="p-2">{pct(c.picks, c.available)}</td>
                <td className="p-2" title="Fighting Spirit + abilities per game">
                  {(c.fs + c.abilities).toFixed(2)}
                </td>
                <td
                  className={cn(
                    'p-2 whitespace-nowrap',
                    c.band === 'strong' || c.creep
                      ? 'text-danger'
                      : 'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {bandLabel(c)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {v.pairs.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">Pairs that win more together</h4>
          <ul className="list-disc pl-5 text-xs">
            {v.pairs.map((p) => (
              <li key={`${p.a}|${p.b}`}>
                {name[p.a]} + {name[p.b]}: {Math.round(100 * p.over)}% more wins than predicted (
                {p.decks} decks, {p.games} games)
              </li>
            ))}
          </ul>
        </div>
      )}
      {v.constructed.decks.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">
            Constructed ({v.constructed.games.toLocaleString()} games)
          </h4>
          <ul className="flex flex-col gap-1">
            {[...v.constructed.decks]
              .sort((a, b) => b.wins / (b.games || 1) - a.wins / (a.games || 1))
              .map((d) => (
                <li key={d.name} className="rounded-lg border bg-panel px-3 py-2 text-xs">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className="tabular-nums">
                      {pct(d.wins, d.games)}{' '}
                      <span className="text-muted-foreground">of {d.games}</span>
                    </span>
                  </div>
                  {d.kind !== 'premade' && (
                    <p className="text-muted-foreground">
                      {d.cards.map((id) => name[id] ?? id).join(', ')}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  )
}
