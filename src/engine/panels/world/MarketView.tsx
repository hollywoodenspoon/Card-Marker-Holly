import { Section, NumberField } from '@/ui/components/fields'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import type { MarketRules } from '../../model/league'
import { useGame } from '../../store/gameStore'

/** Card prices and how many boosters reach the stores. */
export function MarketView() {
  const m = useGame((s) => s.game.league.market)
  const boosters = useGame((s) => s.game.boosters)
  const commit = useGame((s) => s.commit)
  const edit = (recipe: (x: MarketRules) => void, key?: string) =>
    commit((g) => recipe(g.league.market), key)
  const num = (label: string, value: number, set: (x: MarketRules, v: number) => void, o: { step?: number; min?: number; precision?: number } = {}) => (
    <NumberField
      key={label}
      label={label}
      value={value}
      step={o.step ?? 1}
      min={o.min ?? 0}
      precision={o.precision ?? 0}
      onChange={(v) => edit((x) => set(x, v), `mk:${label}`)}
    />
  )
  return (
    <div className="h-full overflow-y-auto" data-testid="market-view">
      <Section title="Card market">
        <p className="text-xs text-muted-foreground">
          Each week the world works out what a card costs from its rarity, how often top decks use
          it and how many copies are out. Shop entries marked “Market price” follow it.
        </p>
        <Label className="flex min-h-11 items-center gap-2 md:min-h-0">
          <input
            type="checkbox"
            checked={m.enabled}
            onChange={(e) => edit((x) => void (x.enabled = e.target.checked))}
          />
          The market is on
        </Label>
      </Section>
      <Section title="Base price by rarity">
        <div className="grid grid-cols-2 gap-2">
          {(['common', 'uncommon', 'rare', 'diamond'] as const).map((k) =>
            num(k[0].toUpperCase() + k.slice(1), m.base[k], (x, v) => void (x.base[k] = v), { precision: 2, step: 1 }),
          )}
        </div>
      </Section>
      <Section title="Prices move">
        <div className="grid grid-cols-2 gap-2">
          {num('Demand (use in top decks)', m.demand, (x, v) => void (x.demand = v), { step: 0.5, precision: 1 })}
          {num('Scarcity (few copies)', m.scarcity, (x, v) => void (x.scarcity = v), { step: 0.5, precision: 1 })}
          {num('Lowest, × base', m.minMult, (x, v) => void (x.minMult = v), { step: 0.1, precision: 2 })}
          {num('Highest, × base', m.maxMult, (x, v) => void (x.maxMult = v), { step: 0.5, precision: 1 })}
        </div>
      </Section>
      <Section title="Booster supply">
        <p className="text-xs text-muted-foreground">
          Boxes of boosters reach each store every month; copies in boosters become cards in
          circulation.
        </p>
        <div className="flex flex-col gap-1">
          <Label htmlFor="mk-booster">Booster that is supplied</Label>
          <NativeSelect
            id="mk-booster"
            value={m.booster ?? ''}
            onChange={(e) => edit((x) => void (x.booster = e.target.value || null))}
          >
            <option value="">(none)</option>
            {boosters.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {num('Boxes per store a month', m.boxesPerMonth, (x, v) => void (x.boxesPerMonth = v))}
          {num('Boosters per box', m.perBox, (x, v) => void (x.perBox = v), { min: 1 })}
          {num('Stores', m.stores, (x, v) => void (x.stores = v))}
          {num('Countries', m.countries, (x, v) => void (x.countries = v))}
        </div>
      </Section>
    </div>
  )
}
