import { Section, NumberField } from '@/ui/components/fields'
import { Input, Label } from '@/ui/components/ui/input'
import type { ReleaseDef } from '../../model/league'
import { useGame } from '../../store/gameStore'
import { CardList, FieldSelect } from './CardPicks'

/** A card release: some cards that always come, and some drawn at random. */
export function ReleaseView({ release }: { release: ReleaseDef }) {
  const commit = useGame((s) => s.commit)
  const r = release
  const edit = (recipe: (x: ReleaseDef) => void, key?: string) =>
    commit((g) => {
      const x = g.league.releases.find((y) => y.id === r.id)
      if (x) recipe(x)
    }, key)
  return (
    <div className="h-full overflow-y-auto" data-testid="release-view">
      <Section title="Release">
        <Input
          aria-label="Release name"
          value={r.name}
          onChange={(e) => edit((x) => void (x.name = e.target.value), `rel-name:${r.id}`)}
        />
        <p className="text-xs text-muted-foreground">
          Put it out with “Put out a card release” in Cause and Effect, from an event or a calendar
          date. Until the first release, every card is in circulation.
        </p>
      </Section>
      <Section title="Cards that always come">
        <CardList label="Fixed cards" ids={r.fixed} onChange={(ids) => edit((x) => void (x.fixed = ids))} />
      </Section>
      <Section title="Cards drawn at random">
        <NumberField
          label="How many more"
          value={r.random}
          step={1}
          precision={0}
          min={0}
          onChange={(v) => edit((x) => void (x.random = Math.round(v)), `rel-n:${r.id}`)}
        />
        <FieldSelect
          id="rel-related"
          label="Draw related cards by"
          value={r.relatedBy}
          none="Not related"
          onChange={(v) => edit((x) => void (x.relatedBy = v))}
        />
        {r.relatedBy && (
          <NumberField
            label="Chance the next card is related (%)"
            value={r.relatedChance}
            step={5}
            precision={0}
            min={0}
            max={100}
            onChange={(v) => edit((x) => void (x.relatedChance = v), `rel-c:${r.id}`)}
          />
        )}
        <FieldSelect
          id="rel-only"
          label="Only cards whose field"
          value={r.onlyField}
          none="Any card"
          onChange={(v) => edit((x) => void (x.onlyField = v))}
        />
        {r.onlyField && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="rel-only-text">holds the text</Label>
            <Input
              id="rel-only-text"
              value={r.onlyText}
              onChange={(e) => edit((x) => void (x.onlyText = e.target.value), `rel-t:${r.id}`)}
            />
          </div>
        )}
      </Section>
    </div>
  )
}
