import { Section, NumberField } from '@/ui/components/fields'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect, Textarea } from '@/ui/components/ui/input'
import { Plus, Trash2 } from '@/ui/icons'
import { newLevel, newTrack, type BotName, type League } from '../../model/league'
import { useGame } from '../../store/gameStore'

const list = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)

/** League-wide settings: levels of duelists, point tracks, how ratings move, and the names. */
export function LeagueView() {
  const league = useGame((s) => s.game.league)
  const commit = useGame((s) => s.commit)
  const edit = (recipe: (l: League) => void, key?: string) =>
    commit((g) => recipe(g.league), key)
  return (
    <div className="h-full overflow-y-auto" data-testid="league-view">
      <Section title="Levels">
        <p className="text-xs text-muted-foreground">
          Duelists belong to a level by rating, lowest first. Tournaments choose how many of each
          level they invite.
        </p>
        <ul className="flex flex-col gap-2">
          {league.levels.map((lv, i) => (
            <li key={lv.id} className="flex flex-col gap-2 rounded-md border p-2">
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Level name"
                  value={lv.name}
                  onChange={(e) =>
                    edit((l) => void (l.levels[i].name = e.target.value), `lv-name:${lv.id}`)
                  }
                />
                <IconButton
                  label={`Remove ${lv.name}`}
                  onClick={() => edit((l) => void l.levels.splice(i, 1))}
                >
                  <Trash2 />
                </IconButton>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label="From rating"
                  value={lv.minRating}
                  step={10}
                  precision={0}
                  onChange={(v) => edit((l) => void (l.levels[i].minRating = v), `lv-r:${lv.id}`)}
                />
                <NumberField
                  label="Duelists"
                  value={lv.population}
                  step={1}
                  precision={0}
                  min={0}
                  onChange={(v) => edit((l) => void (l.levels[i].population = v), `lv-p:${lv.id}`)}
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`bot-${lv.id}`}>Plays</Label>
                  <NativeSelect
                    id={`bot-${lv.id}`}
                    value={lv.bot}
                    onChange={(e) => edit((l) => void (l.levels[i].bot = e.target.value as BotName))}
                  >
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </NativeSelect>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            edit((l) => {
              const top = Math.max(0, ...l.levels.map((x) => x.minRating))
              l.levels.push(newLevel(`Level ${l.levels.length + 1}`, top + 100))
            })
          }
        >
          <Plus /> Level
        </Button>
      </Section>
      <Section title="Point tracks">
        <p className="text-xs text-muted-foreground">
          A ladder of points that tournaments pay into and that other tournaments ask for.
        </p>
        <ul className="flex flex-col gap-2">
          {league.tracks.map((t, i) => (
            <li key={t.id} className="flex items-end gap-2">
              <Input
                aria-label="Track name"
                value={t.name}
                onChange={(e) =>
                  edit((l) => void (l.tracks[i].name = e.target.value), `tr-name:${t.id}`)
                }
              />
              <NumberField
                label="Fades % a year"
                value={t.yearlyDecay}
                step={5}
                precision={0}
                min={0}
                max={100}
                className="w-32 shrink-0"
                onChange={(v) => edit((l) => void (l.tracks[i].yearlyDecay = v), `tr-d:${t.id}`)}
              />
              <IconButton
                label={`Remove ${t.name}`}
                onClick={() => edit((l) => void l.tracks.splice(i, 1))}
              >
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="outline"
          onClick={() => edit((l) => void l.tracks.push(newTrack(`Points ${l.tracks.length + 1}`)))}
        >
          <Plus /> Track
        </Button>
      </Section>
      <Section title="Ratings">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Player starts at"
            value={league.playerRating}
            step={10}
            precision={0}
            onChange={(v) => edit((l) => void (l.playerRating = v), 'rating-start')}
          />
          <NumberField
            label="Change per match"
            value={league.ratingStep}
            step={1}
            precision={0}
            min={0}
            onChange={(v) => edit((l) => void (l.ratingStep = v), 'rating-step')}
          />
          <NumberField
            label="Cards in a duelist’s deck"
            value={league.npcDeckSize}
            step={1}
            precision={0}
            min={1}
            onChange={(v) => edit((l) => void (l.npcDeckSize = v), 'npc-deck')}
          />
          <NumberField
            label="Weekly drift"
            value={league.weeklyDrift}
            step={1}
            precision={0}
            min={0}
            onChange={(v) => edit((l) => void (l.weeklyDrift = v), 'drift')}
          />
        </div>
      </Section>
      <Section title="Names">
        <p className="text-xs text-muted-foreground">
          Separate with commas or new lines. Generated duelists mix a first and a last name and
          come from a region.
        </p>
        {(['first', 'last', 'regions'] as const).map((k) => (
          <div key={k} className="flex flex-col gap-1">
            <Label htmlFor={`names-${k}`}>
              {k === 'first' ? 'First names' : k === 'last' ? 'Last names' : 'Regions'}
            </Label>
            <Textarea
              id={`names-${k}`}
              rows={3}
              defaultValue={league.names[k].join(', ')}
              onBlur={(e) => edit((l) => void (l.names[k] = list(e.target.value)))}
            />
          </div>
        ))}
      </Section>
    </div>
  )
}
