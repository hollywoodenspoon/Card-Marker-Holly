import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/components/ui/button'
import { Section } from '@/ui/components/fields'
import { Input, Label, NativeSelect, Textarea } from '@/ui/components/ui/input'
import { Shuffle } from '@/ui/icons'
import { randomSeed } from '@/playtest/rng'
import { ConditionEditor, StepsEditor } from '../../events/EventsEditor'
import {
  dateOf,
  eventsOn,
  seasonName,
  sizes,
  type Activity,
  type CalendarEvent,
  type EventMode,
  type When,
} from '../../model/calendar'
import type { Step } from '../../model/events'
import { useGame } from '../../store/gameStore'
import { ImageField } from './ImageField'

/** An activity in the centre: what it is, when it's locked or forced, and its steps. */
export function ActivityView({ activity }: { activity: Activity }) {
  const commit = useGame((s) => s.commit)
  const edit = (recipe: (a: Activity) => void, key?: string) =>
    commit((g) => {
      const a = g.calendar.activities.find((x) => x.id === activity.id)
      if (a) recipe(a)
    }, key)
  return (
    <div className="h-full overflow-y-auto" data-testid="activity-view">
      <Common value={activity} title="Activity" onEdit={(r, k) => edit(r, k)} />
      <Section title="Locked when">
        <ConditionEditor
          condition={activity.lock}
          none="never"
          onChange={(c) => edit((a) => void (a.lock = c))}
        />
        {activity.lock && (
          <Input
            aria-label="Why it's locked"
            placeholder="Why it’s locked (shown to the player)"
            value={activity.lockText}
            onChange={(e) => edit((a) => void (a.lockText = e.target.value), `al:${activity.id}`)}
          />
        )}
      </Section>
      <Section title="The only choice when">
        <ConditionEditor
          condition={activity.force}
          none="never"
          onChange={(c) => edit((a) => void (a.force = c))}
        />
      </Section>
      <Section title="When picked">
        <StepsEditor steps={activity.steps} onChange={(recipe) => edit((a) => recipe(a.steps))} />
      </Section>
    </div>
  )
}

/** A calendar event in the centre: its rule, when the player hears of it, and its steps. */
export function CalEventView({ event }: { event: CalendarEvent }) {
  const cal = useGame((s) => s.game.calendar)
  const commit = useGame((s) => s.commit)
  const edit = (recipe: (e: CalendarEvent) => void, key?: string) =>
    commit((g) => {
      const e = g.calendar.events.find((x) => x.id === event.id)
      if (e) recipe(e)
    }, key)
  const setWhen = (w: When) => edit((e) => void (e.when = w))
  const w = event.when
  const n = (v: string, d = 1) => Math.max(1, Number(v) || d)
  const seasons = Math.max(1, Math.floor(cal.seasonsPerYear))
  return (
    <div className="h-full overflow-y-auto" data-testid="calendar-event-view">
      <Common value={event} title="Calendar event" onEdit={(r, k) => edit(r, k)} />
      <Section title="When">
        <NativeSelect
          aria-label="Rule"
          value={w.kind}
          onChange={(e) => {
            const k = e.target.value as When['kind']
            setWhen(
              k === 'weekly'
                ? { kind: 'weekly' }
                : k === 'monthWeek'
                  ? { kind: 'monthWeek', week: 1 }
                  : k === 'seasonWeek'
                    ? { kind: 'seasonWeek', week: 1 }
                    : k === 'once'
                      ? { kind: 'once', year: 1, week: 1 }
                      : { kind: 'random', on: 'important', per: 'season', count: 1 },
            )
          }}
        >
          <option value="weekly">Every week</option>
          <option value="monthWeek">A week of every month</option>
          <option value="seasonWeek">A week of every season</option>
          <option value="once">Once</option>
          <option value="random">At random, on another event</option>
        </NativeSelect>
        {(w.kind === 'monthWeek' || w.kind === 'seasonWeek') && (
          <Labelled label={w.kind === 'monthWeek' ? 'Week of the month' : 'Week of the season'}>
            <Input
              type="number"
              min={1}
              value={w.week}
              onChange={(e) => setWhen({ ...w, week: n(e.target.value) })}
            />
          </Labelled>
        )}
        {w.kind === 'once' && (
          <div className="grid grid-cols-2 gap-2">
            <Labelled label="Year">
              <Input
                type="number"
                min={1}
                value={w.year}
                onChange={(e) => setWhen({ ...w, year: n(e.target.value) })}
              />
            </Labelled>
            <Labelled label="Week of the year">
              <Input
                type="number"
                min={1}
                value={w.week}
                onChange={(e) => setWhen({ ...w, week: n(e.target.value) })}
              />
            </Labelled>
          </div>
        )}
        {w.kind === 'random' && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Labelled label="How many">
              <Input
                type="number"
                min={1}
                value={w.count}
                onChange={(e) => setWhen({ ...w, count: n(e.target.value) })}
              />
            </Labelled>
            <Labelled label="Each">
              <NativeSelect
                value={w.per}
                onChange={(e) => setWhen({ ...w, per: e.target.value as typeof w.per })}
              >
                <option value="month">month</option>
                <option value="season">season</option>
                <option value="year">year</option>
              </NativeSelect>
            </Labelled>
            <Labelled label="On the week of">
              <NativeSelect value={w.on} onChange={(e) => setWhen({ ...w, on: e.target.value })}>
                <option value="important">any important event</option>
                {cal.events
                  .filter((x) => x.id !== event.id && x.when.kind !== 'random')
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </NativeSelect>
            </Labelled>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Label>Only in these seasons (none ticked: every season)</Label>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: seasons }, (_, i) => i + 1).map((s) => (
              <label key={s} className="flex min-h-9 items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={event.seasons.includes(s)}
                  onChange={(e) =>
                    edit((x) => {
                      x.seasons = e.target.checked
                        ? [...x.seasons, s].sort((a, b) => a - b)
                        : x.seasons.filter((v) => v !== s)
                    })
                  }
                />
                {seasonName(cal, s)}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Labelled label="From year (blank: from the start)">
            <Input
              type="number"
              min={1}
              value={event.fromYear ?? ''}
              onChange={(e) =>
                edit((x) => void (x.fromYear = e.target.value ? n(e.target.value) : null))
              }
            />
          </Labelled>
          <Labelled label="Until year (blank: always)">
            <Input
              type="number"
              min={1}
              value={event.toYear ?? ''}
              onChange={(e) =>
                edit((x) => void (x.toYear = e.target.value ? n(e.target.value) : null))
              }
            />
          </Labelled>
        </div>
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={event.important}
            onChange={(e) => edit((x) => void (x.important = e.target.checked))}
          />
          Important (random events like exams can land on it)
        </label>
      </Section>
      <Section title="The player">
        <Labelled label="Hears of it">
          <NativeSelect
            value={event.announce === null ? 'always' : String(event.announce)}
            onChange={(e) =>
              edit(
                (x) =>
                  void (x.announce = e.target.value === 'always' ? null : Number(e.target.value)),
              )
            }
          >
            <option value="always">from the start</option>
            <option value="0">only on the week</option>
            {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((k) => (
              <option key={k} value={k}>
                {k} week{k > 1 ? 's' : ''} ahead
              </option>
            ))}
          </NativeSelect>
        </Labelled>
        <Labelled label="On its week">
          <NativeSelect
            value={event.mode}
            onChange={(e) => edit((x) => void (x.mode = e.target.value as EventMode))}
          >
            <option value="activity">it’s one of the activities to pick</option>
            <option value="forced">it’s the only activity</option>
            <option value="auto">its steps run as the week starts</option>
          </NativeSelect>
        </Labelled>
        {event.mode === 'activity' && (
          <>
            <Label>Locked when</Label>
            <ConditionEditor
              condition={event.lock}
              onChange={(c) => edit((x) => void (x.lock = c))}
            />
            {event.lock && (
              <Input
                aria-label="Why it's locked"
                placeholder="Why it’s locked (shown to the player)"
                value={event.lockText}
                onChange={(e) => edit((x) => void (x.lockText = e.target.value), `el:${event.id}`)}
              />
            )}
          </>
        )}
      </Section>
      <Section title={event.mode === 'auto' ? 'As the week starts' : 'When picked'}>
        <StepsEditor steps={event.steps} onChange={(recipe) => edit((x) => recipe(x.steps))} />
      </Section>
    </div>
  )
}

/** Name, description and picture, shared by activities and calendar events. */
function Common<
  T extends {
    name: string
    description: string
    image: Activity['image']
    id: string
    steps: Step[]
  },
>({
  value,
  title,
  onEdit,
}: {
  value: T
  title: string
  onEdit: (recipe: (x: T) => void, key?: string) => void
}) {
  return (
    <Section title={title}>
      <Input
        aria-label="Name"
        value={value.name}
        onChange={(e) => onEdit((x) => void (x.name = e.target.value), `n:${value.id}`)}
      />
      <Textarea
        aria-label="Description"
        placeholder="What the player reads"
        rows={2}
        value={value.description}
        onChange={(e) => onEdit((x) => void (x.description = e.target.value), `d:${value.id}`)}
      />
      <ImageField value={value.image} onChange={(r) => onEdit((x) => void (x.image = r))} />
    </Section>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

/** A year of the calendar at a glance, with one roll of the random events. */
export function CalendarPreview() {
  const cal = useGame((s) => s.game.calendar)
  const [seed, setSeed] = useState(1)
  const [year, setYear] = useState(1)
  const s = sizes(cal)
  const weeks = useMemo(
    () =>
      Array.from({ length: s.year }, (_, i) => {
        const w = (year - 1) * s.year + i
        return { w, d: dateOf(cal, w), events: eventsOn(cal, w, seed) }
      }),
    [cal, seed, year, s.year],
  )
  const seasons = Array.from({ length: Math.max(1, cal.seasonsPerYear) }, (_, i) => i + 1)
  return (
    <div className="h-full overflow-y-auto p-4" data-testid="calendar-preview">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Labelled label="Year">
          <Input
            type="number"
            min={1}
            className="w-24"
            value={year}
            onChange={(e) => setYear(Math.max(1, Number(e.target.value) || 1))}
          />
        </Labelled>
        <Button
          size="sm"
          variant="outline"
          className="self-end"
          onClick={() => setSeed(randomSeed())}
        >
          <Shuffle /> Roll random events again
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {seasons.map((sn) => (
          <section key={sn} className="rounded-lg border p-2">
            <h3 className="mb-1 text-sm font-semibold">{seasonName(cal, sn)}</h3>
            <ol className="flex flex-col gap-0.5">
              {weeks
                .filter((x) => x.d.season === sn)
                .map((x) => (
                  <li
                    key={x.w}
                    className={cn(
                      'flex gap-2 rounded px-1 py-0.5 text-xs',
                      x.d.week === 1 && 'border-t',
                    )}
                  >
                    <span className="w-6 shrink-0 text-muted-foreground tabular-nums">
                      {x.d.weekOfSeason}
                    </span>
                    <span className="min-w-0 flex-1">
                      {x.events
                        .filter((e) => e.when.kind !== 'weekly')
                        .map((e) => (
                          <span
                            key={e.id}
                            className={cn(
                              'mr-1 inline-block rounded px-1',
                              e.important ? 'bg-accent/25' : 'bg-muted',
                              e.mode === 'forced' && 'ring-1 ring-amber-500',
                            )}
                          >
                            {e.name}
                          </span>
                        ))}
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Weekly events aren’t listed. Highlighted: important. Ringed: forced. Random events land
        differently in each playthrough.
      </p>
    </div>
  )
}
