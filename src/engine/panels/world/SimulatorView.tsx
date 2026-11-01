import { useMemo, useRef, useState } from 'react'
import { Section, NumberField } from '@/ui/components/fields'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Plus, Trash2 } from '@/ui/icons'
import { sizes } from '../../model/calendar'
import {
  defaultPresets,
  simulateSeason,
  type Preset,
  type SimResult,
  type SimRow,
} from '../../league/simulate'
import { leagueCards } from '../../runtime/leagueCards'
import { useGame } from '../../store/gameStore'

/** One colour per preset; they stay apart in light and dark. */
const COLORS = ['#2563eb', '#d97706', '#0d9488', '#c026d3', '#dc2626', '#65a30d']
const colorOf = (i: number) => COLORS[i % COLORS.length]!

interface Run {
  preset: Preset
  result: SimResult
}

/** The season simulator: made-up players run through the calendar and the league's numbers. */
export function SimulatorView() {
  const game = useGame((s) => s.game)
  const [presets, setPresets] = useState<Preset[]>(defaultPresets)
  const [years, setYears] = useState(game.settings.ending.kind === 'years' ? game.settings.ending.years : 7)
  const [seed, setSeed] = useState(1)
  const [boosterId, setBoosterId] = useState(
    game.league.market.booster ?? game.boosters[0]?.id ?? '',
  )
  const [startMoney, setStartMoney] = useState(0)
  const [runs, setRuns] = useState<Run[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [shown, setShown] = useState(0)
  const token = useRef(0)
  const cards = useMemo(() => leagueCards(game), [game])
  const weeksPerYear = sizes(game.calendar).year

  const edit = (id: string, p: Partial<Preset>) =>
    setPresets((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)))

  function run() {
    const mine = ++token.current
    const booster = game.boosters.find((b) => b.id === boosterId)
    const out: Run[] = []
    setBusy(0)
    // One player at a time, a frame between, so the page stays alive on long games.
    const next = (i: number) => {
      if (mine !== token.current) return
      if (i >= presets.length) {
        setRuns(out)
        setShown(0)
        setBusy(null)
        return
      }
      setBusy(i / presets.length)
      setTimeout(() => {
        const preset = presets[i]!
        out.push({
          preset,
          result: simulateSeason({
            league: game.league,
            calendar: game.calendar,
            calSeed: seed,
            cards,
            booster,
            preset,
            years,
            seed: seed + i,
            startMoney,
          }),
        })
        next(i + 1)
      }, 0)
    }
    next(0)
  }

  const noLeague = !game.league.enabled
  const current = runs[Math.min(shown, runs.length - 1)]
  return (
    <div className="h-full overflow-y-auto" data-testid="simulator-view">
      <Section title="Season simulator">
        <p className="text-xs text-muted-foreground">
          Made-up players play through your calendar with the league’s numbers, so you can see
          how points, money, collection, bans and prices move without playing. The same seed
          gives the same result.
        </p>
        {noLeague && (
          <p className="text-xs text-destructive" role="alert">
            The league is off. Turn it on in the League panel first.
          </p>
        )}
        {!cards.length && (
          <p className="text-xs text-muted-foreground">
            No cards are loaded for this game, so releases and bans have nothing to work on. Add a
            card source in the Cards panel.
          </p>
        )}
      </Section>
      <Section title="The game">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Years to play" value={years} min={1} max={40} onChange={setYears} />
          <NumberField label="Seed" value={seed} min={0} onChange={setSeed} />
          <NumberField label="Starting money" value={startMoney} min={0} onChange={setStartMoney} />
          <div className="flex flex-col gap-1">
            <Label htmlFor="sim-booster">Booster they buy</Label>
            <NativeSelect
              id="sim-booster"
              value={boosterId}
              onChange={(e) => setBoosterId(e.target.value)}
            >
              <option value="">(none)</option>
              {game.boosters.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {years} year{years === 1 ? '' : 's'} is {Math.round(years * weeksPerYear)} weeks.
        </p>
      </Section>
      <Section
        title="Players"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setPresets((l) => [
                ...l,
                {
                  id: `p${Date.now().toString(36)}`,
                  name: `Player ${l.length + 1}`,
                  rating: null,
                  entryChance: 70,
                  income: 15,
                  boosters: 2,
                },
              ])
            }
          >
            <Plus /> Player
          </Button>
        }
      >
        {presets.map((p, i) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-lg border p-2.5">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full"
                style={{ background: colorOf(i) }}
              />
              <Input
                aria-label="Player name"
                value={p.name}
                onChange={(e) => edit(p.id, { name: e.target.value })}
              />
              <IconButton
                label={`Remove ${p.name}`}
                onClick={() => setPresets((l) => l.filter((x) => x.id !== p.id))}
                disabled={presets.length < 2}
              >
                <Trash2 />
              </IconButton>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Rating (0: league’s)"
                value={p.rating ?? 0}
                min={0}
                onChange={(v) => edit(p.id, { rating: v > 0 ? v : null })}
              />
              <NumberField
                label="Enters % of the time"
                value={p.entryChance}
                min={0}
                max={100}
                onChange={(v) => edit(p.id, { entryChance: v })}
              />
              <NumberField
                label="Money a week"
                value={p.income}
                min={0}
                onChange={(v) => edit(p.id, { income: v })}
              />
              <NumberField
                label="Boosters a week"
                value={p.boosters}
                min={0}
                onChange={(v) => edit(p.id, { boosters: v })}
              />
            </div>
          </div>
        ))}
        <Button onClick={run} disabled={busy !== null || noLeague} data-testid="sim-run">
          {busy !== null ? `Running… ${Math.round(busy * 100)}%` : 'Run the simulation'}
        </Button>
      </Section>

      {runs.length > 0 && current && (
        <>
          <Section title="Results">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="sim-table">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-2 font-medium">Player</th>
                    <th className="px-2 font-medium">Entered</th>
                    <th className="px-2 font-medium">Wins</th>
                    <th className="px-2 font-medium">Best</th>
                    <th className="px-2 font-medium">Points</th>
                    <th className="px-2 font-medium">Money</th>
                    <th className="px-2 font-medium">Cards</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r, i) => {
                    const last = r.result.rows[r.result.rows.length - 1]
                    return (
                      <tr key={r.preset.id} className="border-t">
                        <td className="py-1.5 pr-2">
                          <span
                            aria-hidden
                            className="mr-1.5 inline-block size-2 rounded-full"
                            style={{ background: colorOf(i) }}
                          />
                          {r.preset.name}
                        </td>
                        <td className="px-2 tabular-nums">{r.result.entered}</td>
                        <td className="px-2 tabular-nums">{r.result.wins}</td>
                        <td className="px-2 tabular-nums">{r.result.bestPlace || '–'}</td>
                        <td className="px-2 tabular-nums">{last?.points ?? 0}</td>
                        <td className="px-2 tabular-nums">{last?.money ?? 0}</td>
                        <td className="px-2 tabular-nums">{last?.collection ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="Over time">
            <Chart
              title="Circuit points"
              runs={runs}
              pick={(r) => r.points}
              perYear={weeksPerYear}
            />
            <Chart title="Money" runs={runs} pick={(r) => r.money} perYear={weeksPerYear} />
            <Chart
              title="Cards owned"
              runs={runs}
              pick={(r) => r.collection}
              perYear={weeksPerYear}
            />
            <Chart title="Rating" runs={runs} pick={(r) => r.rating} perYear={weeksPerYear} />
            <Chart
              title="Average card price"
              runs={runs}
              pick={(r) => r.avgPrice}
              perYear={weeksPerYear}
              from={0}
            />
            <Legend runs={runs} />
          </Section>
          <Section title="Bans">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which player">
              {runs.map((r, i) => (
                <Button
                  key={r.preset.id}
                  size="sm"
                  variant={i === shown ? 'default' : 'outline'}
                  onClick={() => setShown(i)}
                >
                  {r.preset.name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Cards used most in the decks that did best at the end (percent of those decks).
              Only the league’s own duelists are counted, not the player’s deck.
            </p>
            {current.result.watch.length ? (
              <ol className="flex flex-col gap-1" data-testid="sim-watch">
                {current.result.watch.map((w) => (
                  <li key={w.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{w.name}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(w.share)}%</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">Nothing was used enough to watch yet.</p>
            )}
            <p className="text-sm">
              Next ban:{' '}
              {current.result.nextBan.length
                ? current.result.nextBan
                    .map((id) => cards.find((c) => c.id === id)?.name ?? id)
                    .join(', ')
                : 'none'}
            </p>
          </Section>
        </>
      )}
    </div>
  )
}

function Legend({ runs }: { runs: Run[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Colours">
      {runs.map((r, i) => (
        <li key={r.preset.id} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: colorOf(i) }} />
          {r.preset.name}
        </li>
      ))}
    </ul>
  )
}

const W = 320
const H = 110
const PAD = { l: 34, r: 6, t: 6, b: 16 }

/** A line chart with one line per player, week 0 on the left. */
function Chart({
  title,
  runs,
  pick,
  perYear,
  from,
}: {
  title: string
  runs: Run[]
  pick: (r: SimRow) => number
  perYear: number
  from?: number
}) {
  const series = runs.map((r) => r.result.rows.map(pick))
  const n = Math.max(...series.map((s) => s.length), 2)
  const flat = series.flat()
  const lo = from ?? Math.min(...flat, 0)
  const hi = Math.max(...flat, lo + 1)
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const fmt = (v: number) => (Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10))
  const years = Math.floor((n - 1) / perYear)
  const steps = Math.min(years, 10)
  const ticks = steps ? Array.from({ length: steps + 1 }, (_, k) => Math.round((k * years) / steps)) : [0]
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-xs font-medium">{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title} over ${years} years: ${runs
          .map((r, i) => `${r.preset.name} ends at ${fmt(series[i]![series[i]!.length - 1] ?? 0)}`)
          .join(', ')}`}
        className="h-auto w-full text-muted-foreground"
      >
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(v)}
              y2={y(v)}
              stroke="currentColor"
              strokeOpacity={0.2}
            />
            <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" fontSize={8} fill="currentColor">
              {fmt(v)}
            </text>
          </g>
        ))}
        {ticks.map((yr) => (
          <text
            key={yr}
            x={x(yr * perYear)}
            y={H - 4}
            textAnchor="middle"
            fontSize={8}
            fill="currentColor"
          >
            {yr}
          </text>
        ))}
        {series.map((s, i) => (
          <polyline
            key={runs[i]!.preset.id}
            fill="none"
            stroke={colorOf(i)}
            strokeWidth={1.6}
            strokeLinejoin="round"
            points={s.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
          />
        ))}
      </svg>
    </figure>
  )
}
