import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Section } from '@/ui/components/fields'
import { askText } from '@/ui/components/feedback'
import { Copy, Layers, Plus, Trash2 } from '@/ui/icons'
import { useGameCards } from '../../cards/gameCards'
import { deckSize, newDeck } from '../../model/game'
import { useGame } from '../../store/gameStore'

/**
 * Decks: lists of cards with counts. A card source's decks are shown read-only
 * (copy one to change it); game decks are made here, by hand or by the deck builder
 * (suboptimal, optimal, very optimal), and can be built while a game runs too.
 */
export function DecksPanel() {
  const decks = useGame((s) => s.game.decks)
  const sources = useGame((s) => s.game.sources)
  const view = useGame((s) => s.view)
  const merged = useGameCards((s) => s.merged)
  const sourceDecks = useMemo(
    () =>
      sources.flatMap((src) =>
        (merged?.decks[`${src.kind}:${src.id}`] ?? []).map((d) => ({ src, d })),
      ),
    [sources, merged],
  )
  const open = (id: string) => useGame.getState().setView({ kind: 'deck', id })
  const create = async () => {
    const name = await askText({ title: 'New deck', label: 'Name', initial: 'New deck' })
    if (!name) return
    const d = newDeck(name)
    useGame.getState().commit((g) => void g.decks.push(d))
    open(d.id)
  }
  const copy = (
    src: { id: string; name: string },
    d: { name: string; counts: Record<string, number> },
  ) => {
    const deck = { ...newDeck(d.name, { ...d.counts }), origin: { source: src.id, deck: d.name } }
    useGame.getState().commit((g) => void g.decks.push(deck))
    open(deck.id)
  }
  return (
    <div className="flex flex-col">
      <Section
        title="Game decks"
        action={
          <IconButton label="New deck" onClick={() => void create()}>
            <Plus />
          </IconButton>
        }
      >
        <ul className="flex flex-col gap-1" data-testid="game-decks">
          {decks.map((d) => {
            const on = view.kind === 'deck' && view.id === d.id
            return (
              <li key={d.id} className="flex items-center gap-1">
                <button
                  type="button"
                  aria-current={on || undefined}
                  onClick={() => open(d.id)}
                  className={cn(
                    'flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border px-2 text-left text-sm md:min-h-9',
                    on ? 'border-accent bg-accent/10' : 'bg-panel',
                  )}
                >
                  <Layers className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {deckSize(d)}
                  </span>
                </button>
                <IconButton
                  label={`Delete ${d.name}`}
                  onClick={() => {
                    useGame
                      .getState()
                      .commit((g) => void (g.decks = g.decks.filter((x) => x.id !== d.id)))
                    if (on) useGame.getState().setView({ kind: 'none' })
                  }}
                >
                  <Trash2 />
                </IconButton>
              </li>
            )
          })}
        </ul>
        {decks.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No game decks yet. Make one, or copy one of the decks below. A deck is any list of
            cards, so it can be a shop’s stock or “all swords” just as well.
          </p>
        )}
        <Button size="sm" variant="outline" onClick={() => void create()}>
          <Plus /> New deck
        </Button>
      </Section>
      <Section title="From card sources">
        {sourceDecks.length === 0 && (
          <p className="text-xs text-muted-foreground">The card sources have no decks.</p>
        )}
        <ul className="flex flex-col gap-1">
          {sourceDecks.map(({ src, d }) => (
            <li key={`${src.id}:${d.name}`} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {d.name}
                <span className="block text-xs text-muted-foreground">
                  {src.name} · {deckSize(d)} cards
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => copy(src, d)}>
                <Copy /> Copy to game deck
              </Button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
