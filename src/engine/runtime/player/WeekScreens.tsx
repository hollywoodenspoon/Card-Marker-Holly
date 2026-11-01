import { Lock } from '@/ui/icons'
import { cn } from '@/lib/cn'
import { dateLabel, dateOf, seasonName, upcoming } from '../../model/calendar'
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

/** The calendar: today's date and the events the player knows are coming. */
export function CalendarScreen({ onClose }: { onClose: () => void }) {
  const t = useLine()
  const calendar = useRuntime((s) => s.game?.calendar)
  const week = useRuntime((s) => s.week)
  const seed = useRuntime((s) => s.calSeed)
  if (!calendar) return null
  const list = upcoming(calendar, week, seed).filter((x) => x.event.when.kind !== 'weekly')
  const groups = new Map<string, typeof list>()
  for (const x of list) {
    const d = dateOf(calendar, x.week)
    const key = `${seasonName(calendar, d.season)}, year ${d.year}`
    groups.set(key, [...(groups.get(key) ?? []), x])
  }
  const weekly = calendar.events.filter((e) => e.when.kind === 'weekly')
  return (
    <Panel title={t('menu.calendar')} onClose={onClose} testId="player-calendar">
      <p className="mb-3 text-lg font-semibold">{dateLabel(calendar, week)}</p>
      {weekly.length > 0 && (
        <p className="mb-3 text-sm text-white/70">
          Every week: {weekly.map((e) => e.name).join(', ')}
        </p>
      )}
      {!list.length && <p className="text-sm text-white/70">Nothing announced yet.</p>}
      {[...groups].map(([title, items]) => (
        <section key={title} className="mb-3">
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-white/60 uppercase">
            {title}
          </h3>
          <ul className="flex flex-col gap-1">
            {items.map((x) => (
              <li
                key={`${x.event.id}:${x.week}`}
                className={cn(
                  'flex gap-2 rounded-md bg-white/5 px-2 py-1.5 text-sm',
                  x.week === week && 'bg-accent/25',
                )}
              >
                <span className="w-20 shrink-0 text-white/60 tabular-nums">
                  {x.week === week ? t('week.this') : `Week ${dateOf(calendar, x.week).weekOfSeason}`}
                </span>
                <span className="min-w-0 flex-1">
                  {x.event.name}
                  {x.event.description && (
                    <span className="block text-xs text-white/60">{x.event.description}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <PlayerButton className="mt-2" onClick={onClose}>
        Close
      </PlayerButton>
    </Panel>
  )
}
