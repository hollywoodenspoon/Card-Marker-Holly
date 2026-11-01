import { useMemo, useState } from 'react'
import { useGameCards } from '../../cards/gameCards'
import { deckSize } from '../../model/game'
import { closeScreen, useRuntime } from '../runtime'
import { setDeckCard } from '../world'
import { CardFace } from './CardFace'
import { Panel, PlayerButton } from './Panel'

/** "Edit my deck": the player's own cards, with − / + for the deck. */
export function DeckScreen({ deckId }: { deckId: string }) {
  const name = useRuntime((s) => s.game?.decks.find((d) => d.id === deckId)?.name ?? 'Deck')
  const deck = useRuntime((s) => s.decks[deckId] ?? {})
  const collection = useRuntime((s) => s.collection)
  const cards = useGameCards((s) => s.merged?.pack.info.cards)
  const [query, setQuery] = useState('')
  const owned = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (cards ?? []).filter((c) => collection[c.id] && (!q || c.name.toLowerCase().includes(q)))
  }, [cards, collection, query])
  return (
    <Panel
      title={`${name} · ${deckSize({ counts: deck })} cards`}
      wide
      onClose={() => closeScreen()}
      closeLabel="Done"
      testId="player-deck"
      footer={
        <>
          <input
            aria-label="Search your cards"
            placeholder="Search your cards"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-md border border-white/15 bg-black/40 px-2 text-base text-white outline-none md:h-9 md:text-sm"
          />
          <PlayerButton primary onClick={() => closeScreen()}>
            Done
          </PlayerButton>
        </>
      }
    >
      {!owned.length && <p className="text-sm text-white/70">You don’t own any cards yet.</p>}
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {owned.map((c) => {
          const have = collection[c.id]
          const n = deck[c.id] ?? 0
          const total = have.normal + have.foil
          return (
            <li key={c.id} className="flex flex-col gap-1">
              <CardFace id={c.id} foil={have.foil > 0 && have.normal === 0} />
              <span className="truncate text-xs" title={c.name}>
                {c.name}
              </span>
              <span className="text-[11px] text-white/60">
                own {total}
                {have.foil ? ` (${have.foil} foil)` : ''}
              </span>
              <div className="flex items-center justify-between gap-1">
                <PlayerButton
                  aria-label={`One less ${c.name}`}
                  className="min-h-9 w-9 px-0"
                  disabled={n <= 0}
                  onClick={() => setDeckCard(deckId, c.id, n - 1)}
                >
                  −
                </PlayerButton>
                <span className="text-sm tabular-nums">{n}</span>
                <PlayerButton
                  aria-label={`One more ${c.name}`}
                  className="min-h-9 w-9 px-0"
                  disabled={n >= total}
                  onClick={() => setDeckCard(deckId, c.id, n + 1)}
                >
                  +
                </PlayerButton>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
