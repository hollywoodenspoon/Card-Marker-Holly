import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock } from '@/ui/icons'
import { cn } from '@/lib/cn'
import {
  dateLabel,
  dateOf,
  monthName,
  monthsBetween,
  seasonName,
  yearText,
} from '../../model/calendar'
import { useImageUrl } from '../../scenes/images'
import type { ActivityOption } from '../state'
import { useLine } from '../lines'
import { closeScreen, useRuntime } from '../runtime'
import { Panel, PlayerButton } from './Panel'

/** This week's activities: pick one (locked ones show why). */
export function ActivityScreen({
  options,
  forced,
}: {
  options: ActivityOption[]
  forced: boolean
}) {
  const calendar = useRuntime((s) => s.game?.calendar)
  const week = useRuntime((s) => s.week)
  if (!calendar) return null
  return (
    <Panel
      title={`${dateLabel(calendar, week)}: what will you do?`}
      wide
      testId="player-activities"
    >
      {forced && (
        <p className="mb-3 text-sm text-amber-300">This week there’s only one thing to do.</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {options.map((o, i) => (
          <li key={`${o.kind}:${o.id}`}>
            <ActivityCard option={o} onPick={() => closeScreen(i)} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function ActivityCard({ option, onPick }: { option: ActivityOption; onPick: () => void }) {
  const t = useLine()
  const url = useImageUrl(option.image)
  return (
    <button
      type="button"
      disabled={option.locked}
      onClick={onPick}
      className={cn(
        'flex min-h-16 w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left hover:bg-white/15',
        option.locked && 'cursor-not-allowed opacity-50 hover:bg-white/5',
      )}
    >
      {url && <img src={url} alt="" className="size-14 shrink-0 rounded-md object-cover" />}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium">
          {option.locked && <Lock className="size-4" />} {option.name}
          {option.kind === 'event' && (
            <span className="rounded bg-accent/30 px-1.5 text-[10px] uppercase">this week</span>
          )}
        </span>
        <span className="block text-sm text-white/70">
          {option.locked ? option.lockText || t('week.locked') : option.description}
        </span>
      </span>
    </button>
  )
}

/**
 * The calendar: month after month like a wall calendar, each week a cell with the
 * events the player knows of. It opens on this month; scroll up for the past and down
 * for what is coming. Tap a week to read its events.
 */
export function CalendarScreen({ onClose }: { onClose: () => void }) {
  const t = useLine()
  const calendar = useRuntime((s) => s.game?.calendar)
  const ending = useRuntime((s) => s.game?.settings.ending)
  const week = useRuntime((s) => s.week)
  const seed = useRuntime((s) => s.calSeed)
  const [picked, setPicked] = useState<number | null>(null)
  const thisMonth = useRef<HTMLElement | null>(null)
  const [jump, setJump] = useState(0)
  // Open on this month, and again when "Today" is pressed.
  useEffect(() => {
    thisMonth.current?.scrollIntoView({ block: 'start' })
  }, [jump])
  const months = useMemo(() => {
    if (!calendar) return []
    const now = dateOf(calendar, week).year
    const last = ending?.kind === 'years' ? Math.max(now, Math.floor(ending.years)) : now + 2
    return monthsBetween(calendar, week, seed, now - 1, last)
  }, [calendar, week, seed, ending])
  if (!calendar) return null
  const weekly = calendar.events.filter((e) => e.when.kind === 'weekly')
  const today = dateOf(calendar, week)
  const pickedWeek = months.flatMap((m) => m.weeks).find((x) => x.w === picked)
  return (
    <Panel
      title={t('menu.calendar')}
      onClose={onClose}
      testId="player-calendar"
      wide
      footer={
        <>
          <PlayerButton
            onClick={() => {
              setPicked(null)
              setJump((n) => n + 1)
            }}
          >
            Today
          </PlayerButton>
          <PlayerButton onClick={onClose}>Close</PlayerButton>
        </>
      }
    >
      <p className="mb-1 text-lg font-semibold">{dateLabel(calendar, week)}</p>
      {weekly.length > 0 && (
        <p className="mb-3 text-sm text-white/70">
          Every week: {weekly.map((e) => e.name).join(', ')}
        </p>
      )}
      <div className="flex flex-col gap-4" data-testid="calendar-months">
        {months.map((m) => {
          const current = m.year === today.year && m.month === today.month
          const label = `${monthName(calendar, m.month)} ${yearText(calendar, m.year)}`
          return (
            <section
              key={`${m.year}:${m.month}`}
              ref={current ? thisMonth : undefined}
              aria-label={label}
              className="scroll-mt-2 rounded-lg border border-white/10 bg-white/5 p-2"
            >
              <h3 className="mb-2 flex items-baseline gap-2 px-1">
                <span className="text-base font-semibold">{label}</span>
                <span className="text-xs tracking-wide text-white/50 uppercase">
                  {seasonName(calendar, m.season)}
                </span>
              </h3>
              <ol
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${weekColumns(m.weeks.length)}, minmax(0, 1fr))`,
                }}
              >
                {m.weeks.map((x) => (
                  <li key={x.w}>
                    <button
                      type="button"
                      onClick={() => setPicked(picked === x.w ? null : x.w)}
                      aria-pressed={picked === x.w}
                      aria-label={`Week ${x.week} of ${label}${x.w === week ? ', this week' : ''}`}
                      className={cn(
                        'flex min-h-20 w-full flex-col gap-1 rounded-md border border-white/10 p-1.5 text-left text-xs',
                        x.w < week && 'opacity-50',
                        x.w === week && 'border-accent bg-accent/25',
                        picked === x.w && 'ring-2 ring-white/60',
                      )}
                    >
                      <span className="text-white/60 tabular-nums">{x.week}</span>
                      {x.events.map((e) => (
                        <span
                          key={e.id}
                          className={cn(
                            'rounded px-1 leading-tight break-words',
                            e.important ? 'bg-accent/40' : 'bg-white/15',
                          )}
                        >
                          {e.name}
                        </span>
                      ))}
                    </button>
                  </li>
                ))}
              </ol>
              {pickedWeek && m.weeks.some((x) => x.w === picked) && (
                <div className="mt-2 rounded-md bg-black/30 p-2 text-sm">
                  <p className="font-medium">{dateLabel(calendar, pickedWeek.w)}</p>
                  {pickedWeek.events.length === 0 && (
                    <p className="text-white/60">Nothing planned.</p>
                  )}
                  {pickedWeek.events.map((e) => (
                    <p key={e.id}>
                      {e.name}
                      {e.description && (
                        <span className="block text-xs text-white/60">{e.description}</span>
                      )}
                    </p>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </Panel>
  )
}

/** Weeks across a month row: all of them up to six, then split into even rows. */
const weekColumns = (weeks: number) =>
  weeks <= 6 ? weeks : Math.ceil(weeks / Math.ceil(weeks / 6))
