import { Section, NumberField } from '@/ui/components/fields'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Plus, Trash2 } from '@/ui/icons'
import { newStage, type StageKind, type TournamentDef } from '../../model/league'
import { useGame } from '../../store/gameStore'

const KINDS: { id: StageKind; label: string }[] = [
  { id: 'roundRobin', label: 'Round robin (everyone plays everyone)' },
  { id: 'swiss', label: 'Swiss (paired by score)' },
  { id: 'groups', label: 'Groups (round robin inside each group)' },
  { id: 'single', label: 'Single elimination' },
  { id: 'double', label: 'Double elimination' },
]

const nums = (s: string) =>
  s
    .split(/[,\s]+/)
    .map((x) => parseFloat(x))
    .filter((n) => Number.isFinite(n) && n >= 0)

/** One tournament: who plays, the stages, and what it pays. */
export function TournamentView({ tournament }: { tournament: TournamentDef }) {
  const league = useGame((s) => s.game.league)
  const commit = useGame((s) => s.commit)
  const edit = (recipe: (t: TournamentDef) => void, key?: string) =>
    commit((g) => {
      const t = g.league.tournaments.find((x) => x.id === tournament.id)
      if (t) recipe(t)
    }, key)
  const t = tournament
  const splitTotal = t.prizeSplit.reduce((a, b) => a + b, 0)
  return (
    <div className="h-full overflow-y-auto" data-testid="tournament-view">
      <Section title="Tournament">
        <Input
          aria-label="Tournament name"
          value={t.name}
          onChange={(e) => edit((x) => void (x.name = e.target.value), `t-name:${t.id}`)}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Players"
            value={t.players}
            step={1}
            precision={0}
            min={2}
            onChange={(v) => edit((x) => void (x.players = Math.max(2, Math.round(v))), `t-n:${t.id}`)}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="t-region">Who can come</Label>
            <NativeSelect
              id="t-region"
              value={t.region}
              onChange={(e) => edit((x) => void (x.region = e.target.value as 'home' | 'any'))}
            >
              <option value="home">Only the player’s region</option>
              <option value="any">Anyone</option>
            </NativeSelect>
          </div>
        </div>
      </Section>
      <Section title="Entry">
        <div className="flex flex-col gap-1">
          <Label htmlFor="t-entry">The player gets in</Label>
          <NativeSelect
            id="t-entry"
            value={t.entry.kind}
            onChange={(e) =>
              edit((x) => {
                x.entry =
                  e.target.value === 'open'
                    ? { kind: 'open' }
                    : { kind: 'points', track: league.tracks[0]?.id ?? '', points: 10, chance: 100 }
              })
            }
          >
            <option value="open">By signing up</option>
            <option value="points">With enough points, by invitation</option>
          </NativeSelect>
        </div>
        {t.entry.kind === 'points' && (
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="t-etrack">Track</Label>
              <NativeSelect
                id="t-etrack"
                value={t.entry.track}
                onChange={(e) =>
                  edit((x) => {
                    if (x.entry.kind === 'points') x.entry.track = e.target.value
                  })
                }
              >
                <option value="">(none)</option>
                {league.tracks.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <NumberField
              label="Points needed"
              value={t.entry.points}
              step={1}
              precision={0}
              min={0}
              onChange={(v) =>
                edit((x) => {
                  if (x.entry.kind === 'points') x.entry.points = v
                }, `t-ep:${t.id}`)
              }
            />
            <NumberField
              label="Invited %"
              value={t.entry.chance}
              step={5}
              precision={0}
              min={0}
              max={100}
              onChange={(v) =>
                edit((x) => {
                  if (x.entry.kind === 'points') x.entry.chance = v
                }, `t-ec:${t.id}`)
              }
            />
          </div>
        )}
      </Section>
      <Section title="Who is in the field">
        <p className="text-xs text-muted-foreground">
          A weight per level: higher means more of that level. 0 keeps a level out.
        </p>
        {!league.levels.length && (
          <p className="text-xs text-muted-foreground">Add levels in League first.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {league.levels.map((lv) => (
            <NumberField
              key={lv.id}
              label={lv.name}
              value={t.field[lv.id] ?? 0}
              step={1}
              precision={0}
              min={0}
              onChange={(v) => edit((x) => void (x.field[lv.id] = v), `t-f:${t.id}:${lv.id}`)}
            />
          ))}
        </div>
      </Section>
      <Section title="Stages">
        <p className="text-xs text-muted-foreground">
          Stages run in order. “Go on” says how many continue to the next stage (0: everyone).
        </p>
        <ol className="flex flex-col gap-2">
          {t.stages.map((s, i) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-md border p-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
                <NativeSelect
                  aria-label={`Stage ${i + 1} format`}
                  value={s.kind}
                  onChange={(e) =>
                    edit((x) => void (x.stages[i].kind = e.target.value as StageKind))
                  }
                >
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </NativeSelect>
                <IconButton
                  label={`Remove stage ${i + 1}`}
                  onClick={() => edit((x) => void x.stages.splice(i, 1))}
                >
                  <Trash2 />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <NumberField
                  label="Games per match"
                  value={s.bestOf}
                  step={2}
                  precision={0}
                  min={1}
                  onChange={(v) =>
                    edit((x) => void (x.stages[i].bestOf = oddAtLeastOne(v)), `s-b:${s.id}`)
                  }
                />
                {(s.kind === 'single' || s.kind === 'double') && (
                  <NumberField
                    label="Final games (0: same)"
                    value={s.finalBestOf ?? 0}
                    step={2}
                    precision={0}
                    min={0}
                    onChange={(v) =>
                      edit(
                        (x) => void (x.stages[i].finalBestOf = v > 0 ? oddAtLeastOne(v) : null),
                        `s-fb:${s.id}`,
                      )
                    }
                  />
                )}
                {(s.kind === 'swiss' || s.kind === 'groups') && (
                  <NumberField
                    label={s.kind === 'swiss' ? 'Rounds' : 'Groups'}
                    value={s.rounds}
                    step={1}
                    precision={0}
                    min={1}
                    onChange={(v) =>
                      edit((x) => void (x.stages[i].rounds = Math.max(1, Math.round(v))), `s-r:${s.id}`)
                    }
                  />
                )}
                <NumberField
                  label={s.kind === 'groups' ? 'Go on per group' : 'Go on'}
                  value={s.advance}
                  step={1}
                  precision={0}
                  min={0}
                  onChange={(v) =>
                    edit((x) => void (x.stages[i].advance = Math.round(v)), `s-a:${s.id}`)
                  }
                />
              </div>
            </li>
          ))}
        </ol>
        <Button
          size="sm"
          variant="outline"
          onClick={() => edit((x) => void x.stages.push(newStage('single')))}
        >
          <Plus /> Stage
        </Button>
      </Section>
      <Section title="Points and prizes">
        <div className="flex flex-col gap-1">
          <Label htmlFor="t-track">Pays points on</Label>
          <NativeSelect
            id="t-track"
            value={t.track ?? ''}
            onChange={(e) => edit((x) => void (x.track = e.target.value || null))}
          >
            <option value="">(no points)</option>
            {league.tracks.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="t-points">Points by place (1st, 2nd, …)</Label>
          <Input
            id="t-points"
            inputMode="numeric"
            defaultValue={t.pointsByPlace.join(', ')}
            onBlur={(e) => edit((x) => void (x.pointsByPlace = nums(e.target.value)))}
          />
        </div>
        <NumberField
          label="Prize money in total"
          value={t.prizePool}
          step={100}
          precision={0}
          min={0}
          onChange={(v) => edit((x) => void (x.prizePool = v), `t-pool:${t.id}`)}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="t-split">Prize split in percent (1st, 2nd, …)</Label>
          <Input
            id="t-split"
            inputMode="numeric"
            defaultValue={t.prizeSplit.join(', ')}
            onBlur={(e) => edit((x) => void (x.prizeSplit = nums(e.target.value)))}
          />
          {t.prizePool > 0 && splitTotal !== 100 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              The split adds up to {splitTotal}%, not 100%.
            </p>
          )}
        </div>
        <Label className="flex min-h-11 items-center gap-2 md:min-h-0">
          <input
            type="checkbox"
            checked={t.watchForBans}
            onChange={(e) => edit((x) => void (x.watchForBans = e.target.checked))}
          />
          Bans look at this tournament’s results
        </Label>
      </Section>
    </div>
  )
}

const oddAtLeastOne = (v: number) => {
  const n = Math.max(1, Math.round(v))
  return n % 2 === 0 ? n + 1 : n
}
