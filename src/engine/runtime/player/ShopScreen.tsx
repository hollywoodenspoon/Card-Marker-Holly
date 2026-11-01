import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { useGameCards } from '../../cards/gameCards'
import { money } from '../../model/economy'
import { useImageUrl } from '../../scenes/images'
import { closeScreen, useRuntime } from '../runtime'
import { buy, entryPrice, moneyOf, sell, sellable, sellPrice } from '../world'
import { BoosterReveal } from './BoosterReveal'
import { CardFace } from './CardFace'
import { Panel, PlayerButton } from './Panel'

/** A shop: what it sells, and what it buys back from the player. */
export function ShopScreen({ shopId }: { shopId: string }) {
  const game = useRuntime((s) => s.game)
  const screen = useRuntime((s) => s.screen)
  // Re-render on money, items and cards.
  useRuntime((s) => s.vars)
  const inventory = useRuntime((s) => s.inventory)
  const collection = useRuntime((s) => s.collection)
  const cardNames = useGameCards((s) => s.merged?.pack.info.cards)
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [note, setNote] = useState<string | null>(null)
  const shop = game?.shops.find((s) => s.id === shopId)
  const sellList = useMemo(() => {
    if (!shop || !game) return []
    const out: { kind: 'item' | 'card' | 'foil'; id: string; name: string }[] = []
    for (const id of Object.keys(inventory))
      out.push({ kind: 'item', id, name: game.items.find((i) => i.id === id)?.name ?? id })
    for (const [id, c] of Object.entries(collection)) {
      const name = cardNames?.find((x) => x.id === id)?.name ?? id
      if (c.normal) out.push({ kind: 'card', id, name })
      if (c.foil) out.push({ kind: 'foil', id, name: `${name} (foil)` })
    }
    return out.filter((x) => sellPrice(shop.id, x.kind, x.id) > 0)
  }, [shop, game, inventory, collection, cardNames])
  if (!game || !shop) return null
  const econ = game.economy
  const pack = screen?.kind === 'shop' ? screen.pack : null
  if (pack)
    return (
      <BoosterReveal
        pack={pack}
        onDone={() => {
          const sc = useRuntime.getState().screen
          if (sc?.kind === 'shop') useRuntime.setState({ screen: { ...sc, pack: null } })
        }}
      />
    )
  const nameOf = (kind: string, ref: string) =>
    kind === 'item'
      ? (game.items.find((i) => i.id === ref)?.name ?? '?')
      : kind === 'booster'
        ? `${game.boosters.find((b) => b.id === ref)?.name ?? '?'} booster`
        : (cardNames?.find((c) => c.id === ref)?.name ?? ref)
  return (
    <Panel
      title={shop.name}
      wide
      onClose={() => closeScreen()}
      closeLabel="Leave the shop"
      testId="player-shop"
      footer={
        <>
          <span className="flex-1 text-sm text-white/80" data-testid="player-money">
            {econ.money ? `Money: ${money(moneyOf(), econ)}` : 'This game has no money set.'}
          </span>
          {note && <span className="text-sm text-amber-300">{note}</span>}
          <PlayerButton primary onClick={() => closeScreen()}>
            Leave
          </PlayerButton>
        </>
      }
    >
      <ShopImage shopId={shop.id} />
      <div className="mb-3 flex gap-2" role="tablist">
        {(['buy', 'sell'] as const).map((t) => (
          <PlayerButton
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={cn(tab === t && 'bg-white/25')}
            onClick={() => setTab(t)}
          >
            {t === 'buy' ? 'Buy' : 'Sell'}
          </PlayerButton>
        ))}
      </div>
      {tab === 'buy' ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {shop.sells.map((e) => {
            const price = entryPrice(e)
            return (
              <li key={e.id} className="flex flex-col gap-1.5 rounded-lg bg-white/5 p-2">
                {e.kind === 'card' ? (
                  <CardFace id={e.ref} foil={e.foil} />
                ) : (
                  <EntryImage kind={e.kind} refId={e.ref} />
                )}
                <span className="text-sm leading-tight">
                  {nameOf(e.kind, e.ref)}
                  {e.kind === 'card' && e.foil ? ' (foil)' : ''}
                </span>
                <PlayerButton
                  primary
                  disabled={moneyOf() < price}
                  onClick={async () => {
                    setNote((await buy(shop.id, e.id)) ? null : 'Not enough money.')
                  }}
                >
                  Buy · {money(price, econ)}
                </PlayerButton>
              </li>
            )
          })}
          {!shop.sells.length && <li className="text-sm text-white/70">Nothing for sale.</li>}
        </ul>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sellList.map((x) => {
            const left = sellable(x.kind, x.id)
            return (
              <li
                key={`${x.kind}:${x.id}`}
                className="flex items-center gap-2 rounded-md bg-white/5 p-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {x.name} <span className="text-white/60">· {left} to sell</span>
                </span>
                <PlayerButton disabled={left <= 0} onClick={() => sell(shop.id, x.kind, x.id)}>
                  Sell · {money(sellPrice(shop.id, x.kind, x.id), econ)}
                </PlayerButton>
              </li>
            )
          })}
          {!sellList.length && (
            <li className="text-sm text-white/70">
              Nothing this shop buys. Cards in your deck stay.
            </li>
          )}
        </ul>
      )}
    </Panel>
  )
}

function ShopImage({ shopId }: { shopId: string }) {
  const image = useRuntime((s) => s.game?.shops.find((x) => x.id === shopId)?.image ?? null)
  const url = useImageUrl(image)
  return url ? <img src={url} alt="" className="mx-auto mb-3 max-h-40 object-contain" /> : null
}

function EntryImage({ kind, refId }: { kind: 'item' | 'booster'; refId: string }) {
  const image = useRuntime((s) =>
    kind === 'item'
      ? (s.game?.items.find((i) => i.id === refId)?.image ?? null)
      : (s.game?.boosters.find((b) => b.id === refId)?.image ?? null),
  )
  const url = useImageUrl(image)
  return (
    <div className="grid aspect-square place-items-center overflow-hidden rounded-md bg-black/30">
      {url ? (
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="text-3xl opacity-40">{kind === 'booster' ? '🎴' : '◆'}</span>
      )}
    </div>
  )
}
