import { useMemo, useRef, useState } from 'react'
import { randomSeed } from '@/playtest/rng'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { toast } from '@/ui/components/feedback'
import { Loader2, Minus, Plus, Search, Shuffle, Sparkles, X } from '@/ui/icons'
import { draw, shuffled, type DrawState } from '../../cards/draw'
import { useGameCards } from '../../cards/gameCards'
import {
  countsOf,
  DECK_LEVEL_LABELS,
  deckList,
  deckSize,
  type DeckLevel,
  type GameDeck,
} from '../../model/game'
import { deckBuilderFor } from '../../modules/registry'
import { useGame } from '../../store/gameStore'

/** A game deck in the centre: its cards with − / +, the deck builder, and test draws. */
export function DeckView({ deck }: { deck: GameDeck }) {
  const cards = useGameCards((s) => s.merged?.pack.info.cards ?? [])
  const faces = useGameCards((s) => s.open?.faces)
  const commit = useGame((s) => s.commit)
  const [query, setQuery] = useState('')
  const [onlyIn, setOnlyIn] = useState(false)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter(
      (c) => (!onlyIn || deck.counts[c.id]) && (!q || c.name.toLowerCase().includes(q)),
    )
  }, [cards, query, onlyIn, deck.counts])
  const setCount = (id: string, n: number) =>
    commit((g) => {
      const d = g.decks.find((x) => x.id === deck.id)
      if (!d) return
      if (n > 0) d.counts[id] = n
      else delete d.counts[id]
    }, `deck:${deck.id}`)

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="deck-view">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-panel px-3 py-2">
        <Input
          aria-label="Deck name"
          className="h-9 w-48 font-medium md:h-8"
          value={deck.name}
          onChange={(e) =>
            commit((g) => {
              const d = g.decks.find((x) => x.id === deck.id)
              if (d) d.name = e.target.value
            }, `deckname:${deck.id}`)
          }
        />
        <span className="text-sm text-muted-foreground tabular-nums" data-testid="deck-size">
          {deckSize(deck)} cards
        </span>
        {typeof deck.origin !== 'string' && (
          <span className="text-xs text-muted-foreground">copied from {deck.origin.deck}</span>
        )}
        {deck.level && (
          <span className="text-xs text-muted-foreground">
            built: {DECK_LEVEL_LABELS[deck.level]}
          </span>
        )}
        <div className="flex-1" />
        <BuildButton deck={deck} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 px-3 py-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search cards"
                placeholder="Search cards"
                className="h-9 pl-8 md:h-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={onlyIn}
                onChange={(e) => setOnlyIn(e.target.checked)}
              />
              In the deck
            </label>
          </div>
          {cards.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              No cards yet. Add a card source in the Game panel.
            </p>
          )}
          <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2 overflow-y-auto p-3">
            {shown.map((c) => {
              const n = deck.counts[c.id] ?? 0
              const face = faces?.[c.id]?.front
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-1 rounded-lg border bg-panel p-1.5"
                  data-testid={`deck-card-${c.name}`}
                >
                  <div className="grid aspect-[63/88] place-items-center overflow-hidden rounded bg-muted">
                    {face && <img src={face} alt="" className="h-full w-full object-contain" />}
                  </div>
                  <span className="truncate text-xs" title={c.name}>
                    {c.name}
                  </span>
                  <div className="flex items-center justify-between">
                    <IconButton
                      label={`One less ${c.name}`}
                      disabled={!n}
                      onClick={() => setCount(c.id, n - 1)}
                    >
                      <Minus />
                    </IconButton>
                    <span className="text-sm font-semibold tabular-nums">{n}</span>
                    <IconButton label={`One more ${c.name}`} onClick={() => setCount(c.id, n + 1)}>
                      <Plus />
                    </IconButton>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
        <TestDraw deck={deck} />
      </div>
    </div>
  )
}

function BuildButton({ deck }: { deck: GameDeck }) {
  const [level, setLevel] = useState<DeckLevel>('optimal')
  const [busy, setBusy] = useState<number | null>(null)
  const stop = useRef(false)
  const build = async () => {
    const game = useGame.getState().game
    const pool = useGameCards.getState().merged?.pack.info.cards ?? []
    const builder = deckBuilderFor(pool)
    if (!builder)
      return toast('These cards have no deck builder yet (their game module brings one).')
    stop.current = false
    setBusy(0)
    try {
      const gauntlet = [
        ...game.decks.filter((d) => d.id !== deck.id).map((d) => deckList(d)),
        ...(useGameCards.getState().merged?.pack.info.decks ?? []).map((d) => deckList(d)),
      ].filter((d) => d.length)
      const ids = await builder.build({
        cacheKey: game.id,
        pool,
        from: pool,
        level,
        seed: randomSeed(),
        gauntlet,
        onProgress: (p) => setBusy(p),
        stopped: () => stop.current,
      })
      if (!ids) return
      useGame.getState().commit((g) => {
        const d = g.decks.find((x) => x.id === deck.id)
        if (!d) return
        d.counts = countsOf(ids)
        d.level = level
      })
      toast(`Built a ${DECK_LEVEL_LABELS[level].toLowerCase()} deck of ${ids.length} cards.`)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <NativeSelect
        aria-label="Build level"
        className="h-9 w-36 text-sm md:h-8"
        value={level}
        disabled={busy !== null}
        onChange={(e) => setLevel(e.target.value as DeckLevel)}
      >
        {(Object.keys(DECK_LEVEL_LABELS) as DeckLevel[]).map((l) => (
          <option key={l} value={l}>
            {DECK_LEVEL_LABELS[l]}
          </option>
        ))}
      </NativeSelect>
      {busy === null ? (
        <Button size="sm" onClick={() => void build()} data-testid="build-deck">
          <Sparkles /> Build deck
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => (stop.current = true)}>
          <Loader2 className="animate-spin" /> {Math.round(busy * 100)}% · Stop
        </Button>
      )}
    </div>
  )
}

function TestDraw({ deck }: { deck: GameDeck }) {
  const [seed, setSeed] = useState(() => randomSeed() % 100000)
  const [state, setState] = useState<DrawState | null>(null)
  const faces = useGameCards((s) => s.open?.faces)
  const names = useGameCards((s) => s.merged?.pack.info.cards)
  const nameOf = (id: string) => names?.find((c) => c.id === id)?.name ?? id
  const start = () => setState(shuffled(deck, seed))
  return (
    <aside
      className="flex shrink-0 flex-col gap-2 border-t bg-panel p-3 lg:w-72 lg:border-t-0 lg:border-l"
      aria-label="Test draw"
    >
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Test draw
      </h3>
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="draw-seed">Seed</Label>
          <Input
            id="draw-seed"
            type="number"
            className="h-9 w-24 md:h-8"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
          />
        </div>
        <Button size="sm" variant="outline" onClick={start} disabled={!deckSize(deck)}>
          <Shuffle /> Shuffle
        </Button>
      </div>
      {state && (
        <>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setState(draw(state, 1))}
              disabled={!state.pile.length}
            >
              Draw 1
            </Button>
            <Button
              size="sm"
              onClick={() => setState(draw(state, 5))}
              disabled={!state.pile.length}
            >
              Draw 5
            </Button>
            <IconButton label="Clear" onClick={() => setState(null)}>
              <X />
            </IconButton>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="draw-left">
            {state.pile.length} left in the deck · {state.hand.length} in hand
          </p>
          <ul className="flex flex-wrap gap-1" data-testid="draw-hand">
            {state.hand.map((id, i) => (
              <li key={i} className="w-14" title={nameOf(id)}>
                {faces?.[id]?.front ? (
                  <img src={faces[id].front} alt={nameOf(id)} className="w-full rounded" />
                ) : (
                  <span className="block truncate text-[10px]">{nameOf(id)}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
