import { useState } from 'react'
import { newId } from '@/core/model/ids'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Section } from '@/ui/components/fields'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Plus, Trash2 } from '@/ui/icons'
import { useGameCards } from '../../cards/gameCards'
import { RARITY_LABELS, type RarityKey, type Shop, type ShopEntry } from '../../model/economy'
import { useGame } from '../../store/gameStore'
import { ImageField } from './ImageField'

/** A shop in the centre: its picture, what it sells, and what it pays. */
export function ShopView({ shop }: { shop: Shop }) {
  const game = useGame((s) => s.game)
  const commit = useGame((s) => s.commit)
  const cards = useGameCards((s) => s.merged?.pack.info.cards)
  const [adding, setAdding] = useState<'item' | 'booster' | 'card'>('item')
  const [ref, setRef] = useState('')
  const edit = (recipe: (s: Shop) => void, key?: string) =>
    commit((g) => {
      const s = g.shops.find((x) => x.id === shop.id)
      if (s) recipe(s)
    }, key)
  const options =
    adding === 'item'
      ? game.items.map((i) => ({ id: i.id, name: i.name }))
      : adding === 'booster'
        ? game.boosters.map((b) => ({ id: b.id, name: b.name }))
        : (cards ?? []).map((c) => ({ id: c.id, name: c.name }))
  const nameOf = (e: ShopEntry) =>
    e.kind === 'item'
      ? (game.items.find((i) => i.id === e.ref)?.name ?? '(deleted item)')
      : e.kind === 'booster'
        ? `${game.boosters.find((b) => b.id === e.ref)?.name ?? '(deleted booster)'} booster`
        : (cards?.find((c) => c.id === e.ref)?.name ?? e.ref)
  const add = () => {
    if (!ref) return
    edit((s) => {
      const id = newId()
      s.sells.push(
        adding === 'card'
          ? { id, kind: 'card', ref, foil: false, price: 5 }
          : { id, kind: adding, ref, price: null },
      )
    })
    setRef('')
  }
  return (
    <div className="h-full overflow-y-auto" data-testid="shop-view">
      <Section title="Shop">
        <Input
          aria-label="Shop name"
          value={shop.name}
          onChange={(e) => edit((s) => void (s.name = e.target.value), `shop-name:${shop.id}`)}
        />
        <ImageField
          label="Shop picture"
          value={shop.image}
          onChange={(r) => edit((s) => void (s.image = r))}
        />
      </Section>
      <Section title="Sells">
        <ul className="flex flex-col gap-1.5">
          {shop.sells.map((e, i) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{nameOf(e)}</span>
              {e.kind === 'card' && (
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={e.foil}
                    onChange={(ev) =>
                      edit((s) => {
                        const x = s.sells[i]
                        if (x.kind === 'card') x.foil = ev.target.checked
                      })
                    }
                  />
                  Foil
                </label>
              )}
              {e.kind === 'card' && (
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={!!e.market}
                    onChange={(ev) =>
                      edit((s) => {
                        const x = s.sells[i]
                        if (x.kind === 'card') x.market = ev.target.checked
                      })
                    }
                  />
                  Market price
                </label>
              )}
              <Input
                type="number"
                min={0}
                aria-label={`${nameOf(e)} stock`}
                placeholder="no limit"
                title="Stock: copies in stock (empty: unlimited)"
                className="h-9 w-24 md:h-8"
                value={e.stock?.max ?? ''}
                onChange={(ev) =>
                  edit((s) => {
                    const x = s.sells[i]
                    if (ev.target.value === '') delete x.stock
                    else
                      x.stock = {
                        max: Math.max(0, Math.floor(Number(ev.target.value) || 0)),
                        refill: x.stock?.refill ?? 0,
                      }
                  }, `st:${e.id}`)
                }
              />
              {e.stock && (
                <Input
                  type="number"
                  min={0}
                  aria-label={`${nameOf(e)} restock per week`}
                  title="Restock per week"
                  className="h-9 w-20 md:h-8"
                  value={e.stock.refill}
                  onChange={(ev) =>
                    edit((s) => {
                      const x = s.sells[i]
                      if (x.stock)
                        x.stock.refill = Math.max(0, Math.floor(Number(ev.target.value) || 0))
                    }, `sr:${e.id}`)
                  }
                />
              )}
              <Input
                type="number"
                min={0}
                aria-label={`${nameOf(e)} price`}
                placeholder="usual"
                className="h-9 w-24 md:h-8"
                value={e.price ?? ''}
                onChange={(ev) =>
                  edit((s) => {
                    const v =
                      ev.target.value === '' ? null : Math.max(0, Number(ev.target.value) || 0)
                    const x = s.sells[i]
                    if (x.kind === 'card') x.price = v ?? 0
                    else x.price = v
                  }, `sp:${e.id}`)
                }
              />
              <IconButton
                label={`Remove ${nameOf(e)}`}
                size="icon-sm"
                onClick={() => edit((s) => void s.sells.splice(i, 1))}
              >
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Items and boosters with no price here sell at their own price. Stock is how many copies
          the shop has (empty: unlimited); the second number is restocked each week. “Market
          price” follows the league’s card prices once the world runs.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <NativeSelect
            aria-label="Kind to add"
            className="w-28"
            value={adding}
            onChange={(e) => {
              setAdding(e.target.value as typeof adding)
              setRef('')
            }}
          >
            <option value="item">Item</option>
            <option value="booster">Booster</option>
            <option value="card">Card</option>
          </NativeSelect>
          <NativeSelect
            aria-label="What to add"
            className="min-w-40 flex-1"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          >
            <option value="">{options.length ? 'Pick…' : 'Nothing to add yet'}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
          <Button size="sm" variant="outline" disabled={!ref} onClick={add}>
            <Plus /> Add
          </Button>
        </div>
      </Section>
      <Section title="Buys from the player">
        <div className="flex flex-col gap-1">
          <Label htmlFor="buy-items">Items, at % of their price (0: doesn’t buy items)</Label>
          <Input
            id="buy-items"
            type="number"
            min={0}
            max={100}
            value={shop.buyItems}
            onChange={(e) =>
              edit(
                (s) => void (s.buyItems = Math.max(0, Number(e.target.value) || 0)),
                `bi:${shop.id}`,
              )
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Cards, per copy (0: doesn’t buy those). Copies in the player’s deck are never sold.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(RARITY_LABELS) as RarityKey[]).map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <Label htmlFor={`buy-${k}`}>{RARITY_LABELS[k]}</Label>
              <Input
                id={`buy-${k}`}
                type="number"
                min={0}
                value={shop.buyCards[k]}
                onChange={(e) =>
                  edit(
                    (s) => void (s.buyCards[k] = Math.max(0, Number(e.target.value) || 0)),
                    `bc:${shop.id}:${k}`,
                  )
                }
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
