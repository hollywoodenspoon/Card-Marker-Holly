import { Section, NumberField } from '@/ui/components/fields'
import { Label } from '@/ui/components/ui/input'
import type { BanRules } from '../../model/league'
import { useGame } from '../../store/gameStore'
import { CardList } from './CardPicks'

/** The ban list rules. */
export function BansView() {
  const bans = useGame((s) => s.game.league.bans)
  const commit = useGame((s) => s.commit)
  const edit = (recipe: (b: BanRules) => void, key?: string) =>
    commit((g) => recipe(g.league.bans), key)
  return (
    <div className="h-full overflow-y-auto" data-testid="bans-view">
      <Section title="Bans">
        <p className="text-xs text-muted-foreground">
          “Announce a ban list update” in Cause and Effect picks the cards used most by the top
          finishers of tournaments marked “Bans look at this tournament’s results”, announces
          them, and the ban comes into force some weeks later. When and how often is up to your
          events and calendar.
        </p>
        <Label className="flex min-h-11 items-center gap-2 md:min-h-0">
          <input
            type="checkbox"
            checked={bans.enabled}
            onChange={(e) => edit((b) => void (b.enabled = e.target.checked))}
          />
          Bans are on
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Most cards per update"
            value={bans.perUpdate}
            step={1}
            precision={0}
            min={0}
            onChange={(v) => edit((b) => void (b.perUpdate = Math.round(v)), 'ban-n')}
          />
          <NumberField
            label="Weeks of notice"
            value={bans.announceWeeks}
            step={1}
            precision={0}
            min={0}
            onChange={(v) => edit((b) => void (b.announceWeeks = Math.round(v)), 'ban-w')}
          />
          <NumberField
            label="Top finishers that count"
            value={bans.topPlacings}
            step={1}
            precision={0}
            min={1}
            onChange={(v) => edit((b) => void (b.topPlacings = Math.round(v)), 'ban-top')}
          />
          <NumberField
            label="Used in at least (% of decks)"
            value={bans.minShare}
            step={5}
            precision={0}
            min={0}
            max={100}
            onChange={(v) => edit((b) => void (b.minShare = v), 'ban-share')}
          />
        </div>
      </Section>
      <Section title="Banned by hand">
        <p className="text-xs text-muted-foreground">
          These are banned in the next update, whatever the results say.
        </p>
        <CardList
          label="Cards"
          ids={bans.handBanned}
          onChange={(ids) => edit((b) => void (b.handBanned = ids))}
        />
      </Section>
    </div>
  )
}
