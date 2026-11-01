import { newId } from '@/core/model/ids'
import { Button } from '@/ui/components/ui/button'
import { Section } from '@/ui/components/fields'
import { Input, Label } from '@/ui/components/ui/input'
import { CalendarDays, Plus } from '@/ui/icons'
import { cloneSteps } from '../../model/events'
import { newActivity, newCalendarEvent, whenLabel, type Calendar } from '../../model/calendar'
import { useGame } from '../../store/gameStore'
import { ListRow } from './ListRow'

/** Weeks, months, seasons and years; activities; calendar events. */
export function CalendarPanel() {
  const cal = useGame((s) => s.game.calendar)
  const view = useGame((s) => s.view)
  const { commit, setView } = useGame.getState()
  const edit = (recipe: (c: Calendar) => void, key?: string) =>
    commit((g) => recipe(g.calendar), key)
  const isOpen = (kind: string, id: string) => view.kind === kind && 'id' in view && view.id === id
  const sizeField = (
    label: string,
    key: 'weeksPerMonth' | 'monthsPerSeason' | 'seasonsPerYear',
  ) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`cal-${key}`}>{label}</Label>
      <Input
        id={`cal-${key}`}
        type="number"
        min={1}
        max={52}
        value={cal[key]}
        onChange={(e) =>
          edit(
            (c) => void (c[key] = Math.max(1, Math.min(52, Number(e.target.value) || 1))),
            `cal-${key}`,
          )
        }
      />
    </div>
  )
  return (
    <div className="flex flex-col">
      <Section title="Time">
        <p className="text-xs text-muted-foreground">
          Time moves a week at a time. “Pick this week’s activity” shows the choices, runs the
          picked one and starts the next week.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {sizeField('Weeks a month', 'weeksPerMonth')}
          {sizeField('Months a season', 'monthsPerSeason')}
          {sizeField('Seasons a year', 'seasonsPerYear')}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cal-seasons">Season names (comma between)</Label>
          <Input
            id="cal-seasons"
            defaultValue={cal.seasonNames.join(', ')}
            key={cal.seasonNames.join(',')}
            onBlur={(e) =>
              edit((c) => void (c.seasonNames = e.target.value.split(',').map((s) => s.trim())))
            }
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => setView({ kind: 'calendar' })}>
          <CalendarDays /> Preview the calendar
        </Button>
      </Section>
      <Section title="Activities">
        <p className="text-xs text-muted-foreground">
          The player picks one a week. One can be locked (grounded) or forced (exam week) by a
          condition.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const a = newActivity(`Activity ${cal.activities.length + 1}`)
            edit((c) => void c.activities.push(a))
            setView({ kind: 'activity', id: a.id })
          }}
        >
          <Plus /> Activity
        </Button>
        <ul className="flex flex-col gap-1" data-testid="activities">
          {cal.activities.map((a) => (
            <ListRow
              key={a.id}
              name={a.name}
              detail={a.force ? 'Can be forced' : a.lock ? 'Can be locked' : undefined}
              active={isOpen('activity', a.id)}
              onOpen={() => setView({ kind: 'activity', id: a.id })}
              onDuplicate={() =>
                edit(
                  (c) =>
                    void c.activities.push({
                      ...structuredClone(a),
                      id: newId(),
                      name: `${a.name} copy`,
                      steps: cloneSteps(a.steps),
                    }),
                )
              }
              onDelete={() =>
                edit((c) => void (c.activities = c.activities.filter((x) => x.id !== a.id)))
              }
            />
          ))}
        </ul>
      </Section>
      <Section title="Calendar events">
        <p className="text-xs text-muted-foreground">
          Tournaments, exams, holidays, the ending… Each happens on weeks by a rule.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const ev = newCalendarEvent(`Event ${cal.events.length + 1}`)
            edit((c) => void c.events.push(ev))
            setView({ kind: 'calEvent', id: ev.id })
          }}
        >
          <Plus /> Calendar event
        </Button>
        <ul className="flex flex-col gap-1" data-testid="calendar-events">
          {cal.events.map((e) => (
            <ListRow
              key={e.id}
              name={e.name}
              detail={whenLabel(cal, e)}
              active={isOpen('calEvent', e.id)}
              onOpen={() => setView({ kind: 'calEvent', id: e.id })}
              onDuplicate={() =>
                edit(
                  (c) =>
                    void c.events.push({
                      ...structuredClone(e),
                      id: newId(),
                      name: `${e.name} copy`,
                      steps: cloneSteps(e.steps),
                    }),
                )
              }
              onDelete={() => edit((c) => void (c.events = c.events.filter((x) => x.id !== e.id)))}
            />
          ))}
        </ul>
      </Section>
    </div>
  )
}
