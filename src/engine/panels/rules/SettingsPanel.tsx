import { Section } from '@/ui/components/fields'
import { Button } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect, Textarea } from '@/ui/components/ui/input'
import { Switch } from '@/ui/components/ui/switch'
import { Type } from '@/ui/icons'
import type { GameSettings } from '../../model/settings'
import { useGame } from '../../store/gameStore'

/** The game's own rules that aren't Cause and Effect: its length, saves, speed, tutorial, world. */
export function SettingsPanel() {
  const s = useGame((g) => g.game.settings)
  const { commit, setView } = useGame.getState()
  const edit = (recipe: (s: GameSettings) => void, key?: string) =>
    commit((g) => recipe(g.settings), key)
  const num = (label: string, key: 'saveSlots' | 'autoSlots' | 'textSpeed', max: number, hint?: string) => (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={`set-${key}`}>{label}</Label>
      <Input
        id={`set-${key}`}
        type="number"
        min={0}
        max={max}
        value={s[key]}
        onChange={(e) =>
          edit((x) => void (x[key] = Math.max(0, Math.min(max, Number(e.target.value) || 0))), key)
        }
      />
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
  const toggle = (
    label: string,
    key: 'autosaveOnScene' | 'autosaveOnWeek' | 'tutorial' | 'devTools',
    hint?: string,
  ) => (
    <div className="flex items-center gap-2">
      <Switch
        id={`set-${key}`}
        checked={s[key]}
        onCheckedChange={(v) => edit((x) => void (x[key] = v))}
      />
      <Label htmlFor={`set-${key}`} className="min-w-0 flex-1">
        {label}
        {hint && <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </Label>
    </div>
  )
  return (
    <div className="flex flex-col" data-testid="settings-panel">
      <Section title="Game length">
        <div className="flex flex-col gap-1">
          <Label htmlFor="set-ending">The game ends</Label>
          <NativeSelect
            id="set-ending"
            value={s.ending.kind}
            onChange={(e) => edit((x) => void (x.ending.kind = e.target.value as 'never' | 'years'))}
          >
            <option value="never">Never (only when Cause and Effect says so)</option>
            <option value="years">After a number of years</option>
          </NativeSelect>
        </div>
        {s.ending.kind === 'years' && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="set-years">Years</Label>
            <Input
              id="set-years"
              type="number"
              min={1}
              value={s.ending.years}
              onChange={(e) =>
                edit((x) => void (x.ending.years = Math.max(1, Number(e.target.value) || 1)), 'years')
              }
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor="set-ending-text">Ending text</Label>
          <Textarea
            id="set-ending-text"
            rows={2}
            value={s.ending.text}
            onChange={(e) => edit((x) => void (x.ending.text = e.target.value), 'ending-text')}
          />
        </div>
      </Section>
      <Section title="Saving">
        <div className="grid grid-cols-2 gap-2">
          {num('Save slots', 'saveSlots', 99)}
          {num('Autosave slots', 'autoSlots', 20, 'They take turns, oldest first.')}
        </div>
        {toggle('Autosave when the scene changes', 'autosaveOnScene')}
        {toggle('Autosave when a week starts', 'autosaveOnWeek')}
      </Section>
      <Section title="Dialogue">
        {num('Text speed (letters a second)', 'textSpeed', 1000, '0 shows the whole line at once.')}
        {toggle('Show tutorial hints', 'tutorial', 'Off hides every hint in the game.')}
        <Button size="sm" variant="outline" onClick={() => setView({ kind: 'text' })}>
          <Type /> Edit the game’s wording
        </Button>
      </Section>
      <Section title="The world">
        <div className="flex flex-col gap-1">
          <Label htmlFor="set-world">The world moves on</Label>
          <NativeSelect
            id="set-world"
            value={s.worldStep}
            onChange={(e) => edit((x) => void (x.worldStep = e.target.value as 'weekChange' | 'off'))}
          >
            <option value="weekChange">At the end of every week</option>
            <option value="off">Never (only what you play)</option>
          </NativeSelect>
          <span className="text-[11px] text-muted-foreground">
            Other duelists’ tournaments, ratings, prices and stock change then.
          </span>
        </div>
      </Section>
      <Section title="Developer tools">
        {toggle('Show developer tools', 'devTools', 'The season simulator, in the League panel.')}
      </Section>
    </div>
  )
}
