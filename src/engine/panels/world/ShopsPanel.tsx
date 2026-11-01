import { newId } from '@/core/model/ids'
import { Button } from '@/ui/components/ui/button'
import { Section } from '@/ui/components/fields'
import { Plus } from '@/ui/icons'
import { newBooster, newShop } from '../../model/economy'
import { useGame } from '../../store/gameStore'
import { ListRow } from './ListRow'

/** Shops and boosters. */
export function ShopsPanel() {
  const shops = useGame((s) => s.game.shops)
  const boosters = useGame((s) => s.game.boosters)
  const view = useGame((s) => s.view)
  const { commit, setView } = useGame.getState()
  const isOpen = (kind: string, id: string) => view.kind === kind && 'id' in view && view.id === id
  return (
    <div className="flex flex-col">
      <Section title="Shops">
        <p className="text-xs text-muted-foreground">
          “Open a shop” in Cause and Effect shows one. Shops sell items, single cards and boosters,
          and can buy back.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const s = newShop(`Shop ${useGame.getState().game.shops.length + 1}`)
            commit((g) => void g.shops.push(s))
            setView({ kind: 'shop', id: s.id })
          }}
        >
          <Plus /> Shop
        </Button>
        <ul className="flex flex-col gap-1" data-testid="shops">
          {shops.map((s) => (
            <ListRow
              key={s.id}
              name={s.name}
              detail={`${s.sells.length} for sale`}
              active={isOpen('shop', s.id)}
              onOpen={() => setView({ kind: 'shop', id: s.id })}
              onDuplicate={() =>
                commit(
                  (g) =>
                    void g.shops.push({
                      ...structuredClone(s),
                      id: newId(),
                      name: `${s.name} copy`,
                    }),
                )
              }
              onDelete={() => commit((g) => void (g.shops = g.shops.filter((x) => x.id !== s.id)))}
            />
          ))}
        </ul>
      </Section>
      <Section title="Boosters">
        <p className="text-xs text-muted-foreground">
          Packs of cards. Each card rolls its own rarity.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const b = newBooster(`Booster ${useGame.getState().game.boosters.length + 1}`)
            commit((g) => void g.boosters.push(b))
            setView({ kind: 'booster', id: b.id })
          }}
        >
          <Plus /> Booster
        </Button>
        <ul className="flex flex-col gap-1" data-testid="boosters">
          {boosters.map((b) => (
            <ListRow
              key={b.id}
              name={b.name}
              detail={`${b.size} cards · ${b.price}`}
              active={isOpen('booster', b.id)}
              onOpen={() => setView({ kind: 'booster', id: b.id })}
              onDuplicate={() =>
                commit(
                  (g) =>
                    void g.boosters.push({
                      ...structuredClone(b),
                      id: newId(),
                      name: `${b.name} copy`,
                    }),
                )
              }
              onDelete={() =>
                commit((g) => void (g.boosters = g.boosters.filter((x) => x.id !== b.id)))
              }
            />
          ))}
        </ul>
      </Section>
    </div>
  )
}
