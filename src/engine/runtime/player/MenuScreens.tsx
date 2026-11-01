import { useEffect, useState } from 'react'
import { useGameCards } from '../../cards/gameCards'
import { money } from '../../model/economy'
import { useImageUrl } from '../../scenes/images'
import { listSaves, SLOTS, type SaveRow, type SaveSlot } from '../../storage/saves'
import { loadRuntime, saveRuntime, useRuntime } from '../runtime'
import { moneyOf } from '../world'
import { CardFace } from './CardFace'
import { Panel, PlayerButton } from './Panel'

/** The player's money, items and card collection. */
export function BagScreen({ onClose }: { onClose: () => void }) {
  const game = useRuntime((s) => s.game)
  const inventory = useRuntime((s) => s.inventory)
  const collection = useRuntime((s) => s.collection)
  useRuntime((s) => s.vars)
  const cards = useGameCards((s) => s.merged?.pack.info.cards)
  if (!game) return null
  const owned = (cards ?? []).filter((c) => collection[c.id])
  const copies = Object.values(collection).reduce((n, c) => n + c.normal + c.foil, 0)
  return (
    <Panel title="Bag" wide onClose={onClose} testId="player-bag">
      {game.economy.money && (
        <p className="mb-3 text-lg font-semibold">{money(moneyOf(), game.economy)}</p>
      )}
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-white/60 uppercase">Items</h3>
      {!Object.keys(inventory).length && <p className="mb-3 text-sm text-white/70">No items.</p>}
      <ul className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(inventory).map(([id, n]) => {
          const item = game.items.find((i) => i.id === id)
          return <ItemTile key={id} name={item?.name ?? id} n={n} image={item?.image ?? null} />
        })}
      </ul>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-white/60 uppercase">
        Cards · {copies} copies of {owned.length} cards
      </h3>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
        {owned.map((c) => (
          <li key={c.id} className="flex flex-col gap-1">
            <CardFace id={c.id} foil={collection[c.id].foil > 0} />
            <span className="truncate text-xs">{c.name}</span>
            <span className="text-[11px] text-white/60">
              ×{collection[c.id].normal}
              {collection[c.id].foil ? ` · foil ×${collection[c.id].foil}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function ItemTile({
  name,
  n,
  image,
}: {
  name: string
  n: number
  image: Parameters<typeof useImageUrl>[0]
}) {
  const url = useImageUrl(image)
  return (
    <li className="flex items-center gap-2 rounded-md bg-white/5 p-2 text-sm">
      {url && <img src={url} alt="" className="size-10 rounded object-contain" />}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="tabular-nums text-white/70">×{n}</span>
    </li>
  )
}

/** Everything said so far. */
export function LogScreen({ onClose }: { onClose: () => void }) {
  const log = useRuntime((s) => s.log)
  return (
    <Panel title="Log" onClose={onClose} testId="player-log">
      {!log.length && <p className="text-sm text-white/70">Nothing said yet.</p>}
      <ol className="flex flex-col gap-2">
        {log.map((l, i) => (
          <li key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
            {l.name && (
              <span className="font-semibold" style={{ color: l.color ?? undefined }}>
                {l.name}:{' '}
              </span>
            )}
            <span className={l.name === null && l.text.startsWith('▸') ? 'text-white/60' : ''}>
              {l.text}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/** Save to one of 3 slots, or load any slot (the autosave too). */
export function SavesScreen({ onClose }: { onClose: () => void }) {
  const gameId = useRuntime((s) => s.game?.id)
  const [rows, setRows] = useState<SaveRow[]>([])
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!gameId) return
    let live = true
    listSaves(gameId)
      .then((r) => live && setRows(r))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [gameId, v])
  const row = (slot: SaveSlot) => rows.find((r) => r.slot === slot)
  return (
    <Panel title="Save and load" onClose={onClose} testId="player-saves">
      <p className="mb-3 text-sm text-white/70">
        A saved game starts again at the start of its scene.
      </p>
      <ul className="flex flex-col gap-2">
        {SLOTS.map((slot) => {
          const r = row(slot)
          return (
            <li key={slot} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {slot === 'auto' ? 'Autosave' : `Slot ${slot}`}
                </span>
                <span className="block truncate text-xs text-white/60">
                  {r ? `${r.label} · ${new Date(r.savedAt).toLocaleString()}` : 'Empty'}
                </span>
              </span>
              {slot !== 'auto' && (
                <PlayerButton
                  onClick={async () => {
                    await saveRuntime(slot)
                    setV((x) => x + 1)
                  }}
                >
                  Save
                </PlayerButton>
              )}
              <PlayerButton
                primary
                disabled={!r}
                onClick={async () => {
                  if (await loadRuntime(slot)) onClose()
                }}
              >
                Load
              </PlayerButton>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
