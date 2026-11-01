import { useMemo } from 'react'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Section } from '@/ui/components/fields'
import { Input, Label, NativeSelect, Textarea } from '@/ui/components/ui/input'
import { Plus, Trash2 } from '@/ui/icons'
import { useGameCards } from '../../cards/gameCards'
import { isAce, newItem, type Economy, type Item } from '../../model/economy'
import { newVariable } from '../../model/game'
import { useGame } from '../../store/gameStore'
import { ImageField } from './ImageField'

/** Money, the card collection's settings, and items. */
export function ItemsPanel() {
  return (
    <div className="flex flex-col">
      <MoneySection />
      <CollectionSection />
      <ItemsSection />
    </div>
  )
}

function useEconomy() {
  const e = useGame((s) => s.game.economy)
  const commit = useGame((s) => s.commit)
  const edit = (recipe: (e: Economy) => void, key?: string) => commit((g) => recipe(g.economy), key)
  return [e, edit] as const
}

function MoneySection() {
  const [e, edit] = useEconomy()
  const variables = useGame((s) => s.game.variables)
  const numbers = useMemo(() => variables.filter((v) => v.kind === 'number'), [variables])
  const commit = useGame((s) => s.commit)
  return (
    <Section title="Money">
      <p className="text-xs text-muted-foreground">
        One currency: a number variable. Shops, prices and “give money” use it.
      </p>
      <div className="flex flex-col gap-1">
        <Label htmlFor="money-var">Money is the number</Label>
        <div className="flex gap-1">
          <NativeSelect
            id="money-var"
            value={e.money ?? ''}
            onChange={(ev) => edit((x) => void (x.money = ev.target.value || null))}
          >
            <option value="">None yet</option>
            {numbers.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </NativeSelect>
          {!e.money && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                commit((g) => {
                  const v = newVariable('Money', 'number')
                  g.variables.push(v)
                  g.economy.money = v.id
                })
              }
            >
              <Plus /> Make one
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="money-unit">Unit (after amounts)</Label>
        <Input
          id="money-unit"
          placeholder="coins"
          value={e.unit}
          onChange={(ev) => edit((x) => void (x.unit = ev.target.value), 'money-unit')}
        />
      </div>
    </Section>
  )
}

function CollectionSection() {
  const [e, edit] = useEconomy()
  const decks = useGame((s) => s.game.decks)
  const cards = useGameCards((s) => s.merged?.pack.info.cards)
  const fields = useMemo(
    () => [...new Set((cards ?? []).flatMap((c) => Object.keys(c.fields)))].sort(),
    [cards],
  )
  const aces = useMemo(() => (cards ?? []).filter((c) => isAce(c.fields, e)).length, [cards, e])
  return (
    <Section title="Card collection">
      <div className="flex flex-col gap-1">
        <Label htmlFor="ace-field">Ace field (uncommon in boosters)</Label>
        <NativeSelect
          id="ace-field"
          value={e.aceField}
          onChange={(ev) => edit((x) => void (x.aceField = ev.target.value))}
        >
          <option value="">No Ace field</option>
          {fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
          {e.aceField && !fields.includes(e.aceField) && (
            <option value={e.aceField}>{e.aceField}</option>
          )}
        </NativeSelect>
      </div>
      {e.aceField && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="ace-text">Counts as Ace when it holds</Label>
          <Input
            id="ace-text"
            placeholder="any value"
            value={e.aceText}
            onChange={(ev) => edit((x) => void (x.aceText = ev.target.value), 'ace-text')}
          />
          <p className="text-xs text-muted-foreground" data-testid="ace-count">
            {cards ? `${aces} of ${cards.length} cards are Aces.` : 'Cards are loading…'}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="start-cards">The player starts with</Label>
        <NativeSelect
          id="start-cards"
          value={e.startingCards ?? ''}
          onChange={(ev) => edit((x) => void (x.startingCards = ev.target.value || null))}
        >
          <option value="">No cards</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">A deck’s cards, as normal copies.</p>
      </div>
    </Section>
  )
}

function ItemsSection() {
  const items = useGame((s) => s.game.items)
  const commit = useGame((s) => s.commit)
  const edit = (id: string, recipe: (i: Item) => void, key?: string) =>
    commit((g) => {
      const i = g.items.find((x) => x.id === id)
      if (i) recipe(i)
    }, key)
  return (
    <Section
      title="Items"
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => commit((g) => void g.items.push(newItem(`Item ${g.items.length + 1}`)))}
        >
          <Plus /> Item
        </Button>
      }
    >
      {!items.length && (
        <p className="text-xs text-muted-foreground">
          Things the player buys and keeps: study aids, gifts… Kept as counts.
        </p>
      )}
      <ul className="flex flex-col gap-2" data-testid="items">
        {items.map((it) => (
          <li key={it.id} className="flex flex-col gap-2 rounded-lg border p-2">
            <div className="flex items-center gap-1">
              <Input
                aria-label="Item name"
                className="h-9 min-w-0 flex-1 md:h-8"
                value={it.name}
                onChange={(e) => edit(it.id, (x) => void (x.name = e.target.value), `it:${it.id}`)}
              />
              <Input
                type="number"
                min={0}
                aria-label={`${it.name} price`}
                title="Price"
                className="h-9 w-20 md:h-8"
                value={it.price}
                onChange={(e) =>
                  edit(
                    it.id,
                    (x) => void (x.price = Math.max(0, Number(e.target.value) || 0)),
                    `ip:${it.id}`,
                  )
                }
              />
              <IconButton
                label={`Delete ${it.name}`}
                size="icon-sm"
                onClick={() =>
                  commit((g) => void (g.items = g.items.filter((x) => x.id !== it.id)))
                }
              >
                <Trash2 />
              </IconButton>
            </div>
            <ImageField value={it.image} onChange={(r) => edit(it.id, (x) => void (x.image = r))} />
            <Textarea
              aria-label={`${it.name} description`}
              placeholder="Description"
              rows={2}
              value={it.description}
              onChange={(e) =>
                edit(it.id, (x) => void (x.description = e.target.value), `id:${it.id}`)
              }
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}
