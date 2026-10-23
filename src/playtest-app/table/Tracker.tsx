import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Dices,
  Flag,
  Minus,
  Plus,
  RotateCcw,
  Shuffle,
} from '@/ui/icons'
import { cn } from '@/lib/cn'
import { zoneKey, type GameSetup } from '@/playtest/setup'
import type { TableState } from '@/playtest/state'
import { Button, IconButton } from '@/ui/components/ui/button'
import { actor } from '@/adventure/engine'
import { recentActions, stepVerb } from './activity'
import { TokenShape } from './Piece'
import { shownRules, usePlaytest } from './usePlaytest'

const PHASE_NAMES = {
  setup: 'Setup',
  skirmish: 'Skirmish',
  combat: 'Combat',
  regroup: 'Regroup',
  over: 'Game over',
} as const

/** Counters, initiative and token trays per seat; round, phase and randomisers for the table. */
export function Tracker({ phone }: { phone: boolean }) {
  const setup = usePlaytest((s) => s.setup)!
  const state = usePlaytest((s) => s.state)!
  const act = usePlaytest((s) => s.act)
  // With the rules on, the rules keep score; the tracker only shows it.
  const rules = usePlaytest(shownRules)
  const bots = usePlaytest((s) => s.bots)
  const who = rules ? actor(rules) : null
  if (rules)
    return (
      <div
        className={cn(
          'flex shrink-0 items-center gap-x-3 gap-y-1.5 border-b bg-panel px-2 py-1.5',
          phone ? 'overflow-x-auto [&>*]:shrink-0' : 'flex-wrap',
        )}
        data-testid="playtest-tracker"
      >
        {rules.players.map((p, seat) => (
          <span
            key={seat}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm transition-shadow',
              who === seat && 'shadow-[0_0_0_2px_var(--seat),0_0_14px_var(--seat)]',
            )}
            style={
              {
                borderColor: `color-mix(in oklab, ${setup.seats[seat]?.color} 60%, transparent)`,
                '--seat': setup.seats[seat]?.color,
              } as React.CSSProperties
            }
            data-testid={`playtest-seat-${seat}`}
            data-acting={who === seat || undefined}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: setup.seats[seat]?.color }}
            />
            <span className="font-medium">{p.name}</span>
            {/* Not yet known while rock-paper-scissors decides it. */}
            {rules.initiative === seat &&
              rules.step.k !== 'rps' &&
              rules.step.k !== 'initiative' && (
                <Flag className="size-4 fill-current text-amber-500" aria-label="Initiative" />
              )}
            <span
              className={cn(
                'tabular-nums',
                rules.winner?.seat === seat && 'font-bold text-amber-500',
              )}
            >
              Points <span className="font-semibold">{p.points}</span>
            </span>
            <span
              className="text-muted-foreground tabular-nums"
              data-testid={`playtest-hand-${seat}`}
            >
              Hand <span className="font-semibold text-foreground">{p.support.length}</span>
            </span>
            {rules.engagement?.passed[seat] && (
              <span className="rounded bg-muted px-1 text-[11px] font-semibold uppercase">
                Passed
              </span>
            )}
            <span
              className="max-w-[16rem] truncate text-xs text-muted-foreground"
              data-testid={`playtest-doing-${seat}`}
            >
              {who === seat ? (
                <span className="font-semibold text-foreground">
                  <span
                    className="mr-1 inline-block size-1.5 rounded-full bg-current align-middle motion-safe:animate-pulse"
                    aria-hidden
                  />
                  {stepVerb(rules)}
                  {bots[seat] ? ' · thinking…' : ''}
                </span>
              ) : (
                recentActions(rules, seat as 0 | 1, 1)[0]
              )}
            </span>
          </span>
        ))}
        <span className="text-sm tabular-nums" data-testid="playtest-phase">
          Round {rules.round} · <span className="font-semibold">{PHASE_NAMES[rules.phase]}</span>
        </span>
        <span className="text-xs text-muted-foreground">Rules on</span>
      </div>
    )
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-x-3 gap-y-1.5 border-b bg-panel px-2 py-1.5',
        // One scrolling row on phones, so the table keeps the screen.
        phone ? 'overflow-x-auto [&>*]:shrink-0' : 'flex-wrap',
      )}
      data-testid="playtest-tracker"
    >
      {setup.seats.map((_, seat) => (
        <SeatBox key={seat} setup={setup} state={state} seat={seat} />
      ))}
      {setup.counters
        .filter((c) => !c.perSeat)
        .map((c) => (
          <CounterBox key={c.id} name={c.name} value={state.counters[c.id] ?? c.start} k={c.id} />
        ))}
      <TokenTray setup={setup} state={state} seat={null} />
      <div className="flex items-center gap-0.5" aria-label="Round and phase">
        <IconButton
          size="icon-sm"
          label="Previous phase"
          onClick={() => act({ t: 'phase', delta: -1 })}
        >
          <ChevronLeft />
        </IconButton>
        <span className="min-w-20 text-center text-sm tabular-nums" data-testid="playtest-phase">
          Round {state.round}
          {setup.phases.length > 0 && (
            <span className="font-semibold"> · {setup.phases[state.phase]}</span>
          )}
        </span>
        <IconButton size="icon-sm" label="Next phase" onClick={() => act({ t: 'phase', delta: 1 })}>
          <ChevronRight />
        </IconButton>
      </div>
      {setup.coin && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => act({ t: 'coin' })}
          data-testid="playtest-coin"
        >
          <Coins /> {state.last.coin ?? 'Flip coin'}
        </Button>
      )}
      {setup.dice.map((d) => (
        <Button
          key={d.id}
          size="sm"
          variant="secondary"
          onClick={() => act({ t: 'roll', dice: d.id })}
        >
          <Dices /> {d.name}
          {state.last.roll?.name === d.name && (
            <span className="font-semibold tabular-nums">
              : {state.last.roll.values.join('+')}
              {state.last.roll.values.length > 1 &&
                ` = ${state.last.roll.values.reduce((a, b) => a + b, 0)}`}
            </span>
          )}
        </Button>
      ))}
      {setup.deal?.randomSetup && (
        <Button size="sm" variant="ghost" onClick={() => act({ t: 'randomSetup' })}>
          <Shuffle /> Random setup
        </Button>
      )}
      {setup.cardStates.length > 1 && (
        <Button size="sm" variant="ghost" onClick={() => act({ t: 'resetStates' })}>
          <RotateCcw /> All {setup.cardStates[0].name}
        </Button>
      )}
    </div>
  )
}

function SeatBox({ setup, state, seat }: { setup: GameSetup; state: TableState; seat: number }) {
  const act = usePlaytest((s) => s.act)
  const s = setup.seats[seat]
  const has = state.initiative === seat
  return (
    <div
      className="flex items-center gap-1 rounded-lg border px-1.5 py-0.5"
      style={{ borderColor: `color-mix(in oklab, ${s.color} 60%, transparent)` }}
      data-testid={`playtest-seat-${seat}`}
    >
      <span className="size-2.5 rounded-full" style={{ background: s.color }} />
      <span className="text-sm font-medium">{s.name}</span>
      {setup.initiative && (
        <IconButton
          size="icon-sm"
          label={
            has
              ? `${s.name} has ${setup.initiativeName ?? 'initiative'}`
              : `Give ${setup.initiativeName ?? 'initiative'} to ${s.name}`
          }
          onClick={() => act({ t: 'initiative', seat })}
          className={cn(has ? 'text-amber-500' : 'text-muted-foreground/50')}
          aria-pressed={has}
        >
          <Flag className={cn(has && 'fill-current')} />
        </IconButton>
      )}
      {setup.counters
        .filter((c) => c.perSeat)
        .map((c) => (
          <CounterBox
            key={c.id}
            name={c.name}
            value={state.counters[zoneKey(c.id, seat)] ?? c.start}
            k={zoneKey(c.id, seat)}
            win={state.winner?.seat === seat}
          />
        ))}
      <TokenTray setup={setup} state={state} seat={seat} />
    </div>
  )
}

/** Tokens waiting in a seat's tray (seat null: shared tokens). Tap one, then tap where it goes. */
function TokenTray({
  setup,
  state,
  seat,
}: {
  setup: GameSetup
  state: TableState
  seat: number | null
}) {
  const selected = usePlaytest((s) => s.selected)
  const select = usePlaytest((s) => s.select)
  const pool = Object.values(state.tokens).filter((t) => t.owner === seat && 'pool' in t.at)
  if (!pool.length) return null
  const who = seat === null ? '' : `${setup.seats[seat]?.name}'s `
  return (
    <span className="flex items-center" data-testid={`playtest-tray-${seat ?? 'table'}`}>
      {pool.map((t) => {
        const def = setup.tokens.find((d) => d.id === t.tokenId)
        if (!def) return null
        const on = selected?.kind === 'token' && selected.id === t.id
        const color =
          def.color === 'seat' ? (seat === null ? '#64748b' : setup.seats[seat].color) : def.color
        return (
          <button
            key={t.id}
            type="button"
            className={cn(
              'grid size-11 place-items-center rounded-md hover:bg-muted md:size-8',
              on && 'bg-accent-soft ring-2 ring-accent',
            )}
            title={`${def.name}: tap, then tap where it goes`}
            aria-label={`Place ${who}${def.name}`}
            aria-pressed={on}
            onClick={() => select(on ? null : { kind: 'token', id: t.id }, !on)}
          >
            <TokenShape def={def} color={color} px={18} />
          </button>
        )
      })}
    </span>
  )
}

function CounterBox({
  name,
  value,
  k,
  win,
}: {
  name: string
  value: number
  k: string
  win?: boolean
}) {
  const act = usePlaytest((s) => s.act)
  return (
    <span className="flex items-center" aria-label={`${name}: ${value}`}>
      <IconButton
        size="icon-sm"
        label={`${name} minus 1`}
        onClick={() => act({ t: 'counter', key: k, delta: -1 })}
      >
        <Minus />
      </IconButton>
      <span
        className={cn(
          'min-w-12 text-center text-sm tabular-nums',
          win && 'font-bold text-amber-500',
        )}
      >
        {name} <span className="font-semibold">{value}</span>
      </span>
      <IconButton
        size="icon-sm"
        label={`${name} plus 1`}
        onClick={() => act({ t: 'counter', key: k, delta: 1 })}
      >
        <Plus />
      </IconButton>
    </span>
  )
}
