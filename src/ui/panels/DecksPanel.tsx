import { Copy, Minus, MoreHorizontal, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import type { Card, Deck } from '@/core/model/types'
import { cn } from '@/lib/cn'
import {
  addDeck,
  deckSize,
  deleteDeck,
  duplicateDeck,
  renameDeck,
  setDeckCount,
  setPrintDeck,
} from '@/templates/deckCommands'
import { CardThumb } from '@/ui/canvas/CardThumb'
import { Button, IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Input, NativeSelect } from '@/ui/components/ui/input'
import { useUi } from '@/ui/uiStore'

const NO_DECKS: Deck[] = []

/** Named decks with a count per card (e.g. two starter decks). */
export function DecksPanel() {
  const decks = useEditor((s) => s.doc?.project.decks) ?? NO_DECKS
  const cards = useEditor((s) => s.doc?.cards)
  const [openId, setOpenId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [q, setQ] = useState('')
  const deck = decks.find((d) => d.id === openId) ?? decks[0]
  const list = useMemo(
    () => (cards ? Object.values(cards).sort((a, b) => a.order - b.order) : []),
    [cards],
  )
  const shown = q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : list

  if (!decks.length)
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          A deck says how many of each card it holds, like a starter deck for each player. Print a
          deck, filter the gallery by it, or export it for Tabletop Simulator.
        </p>
        <Button onClick={() => setOpenId(addDeck('Deck 1'))}>
          <Plus /> New deck
        </Button>
      </div>
    )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 p-3">
        {renaming && deck ? (
          <Input
            autoFocus
            aria-label="Deck name"
            defaultValue={deck.name}
            onBlur={(e) => {
              renameDeck(deck.id, e.target.value)
              setRenaming(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        ) : (
          <NativeSelect
            aria-label="Deck"
            value={deck?.id}
            onChange={(e) => setOpenId(e.target.value)}
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({deckSize(d)})
              </option>
            ))}
          </NativeSelect>
        )}
        <IconButton label="New deck" onClick={() => setOpenId(addDeck('Deck'))}>
          <Plus />
        </IconButton>
        {deck && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label={`Options for ${deck.name}`}>
                <MoreHorizontal />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpenId(duplicateDeck(deck.id) ?? null)}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                danger
                onSelect={() => {
                  deleteDeck(deck.id)
                  setOpenId(null)
                }}
              >
                <Trash2 /> Delete deck
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {deck && (
        <>
          <div className="flex items-center gap-2 px-3 pb-2">
            <span className="text-xs text-muted-foreground" data-testid="deck-summary">
              {deckSize(deck)} card{deckSize(deck) === 1 ? '' : 's'} ·{' '}
              {Object.keys(deck.counts).length} different
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPrintDeck(deck.id)
                useUi.getState().setPrintOpen(true)
              }}
            >
              <Printer /> Print deck
            </Button>
          </div>
          <div className="px-3 pb-2">
            <Input
              placeholder="Search"
              aria-label="Search cards in deck"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ul
            className="min-h-0 flex-1 space-y-0.5 overflow-auto px-2 pb-3"
            aria-label="Cards in deck"
          >
            {shown.map((c) => (
              <DeckRow key={c.id} deck={deck} card={c} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function DeckRow({ deck, card }: { deck: Deck; card: Card }) {
  const n = deck.counts[card.id] ?? 0
  const set = (v: number) => setDeckCount(deck.id, [card.id], v, `deck:${deck.id}:${card.id}`)
  return (
    <li className="flex items-center gap-2 rounded-lg p-1" data-testid="deck-row">
      <CardThumb card={card} side="front" heightPx={36} className={cn(!n && 'opacity-40')} />
      <span className={cn('min-w-0 flex-1 truncate text-sm', !n && 'text-muted-foreground')}>
        {card.name}
      </span>
      <IconButton
        label={`Fewer ${card.name} in ${deck.name}`}
        size="icon-sm"
        disabled={n <= 0}
        onClick={() => set(n - 1)}
      >
        <Minus />
      </IconButton>
      <span className="w-6 text-center text-sm tabular-nums" aria-label={`${card.name} count`}>
        {n}
      </span>
      <IconButton
        label={`More ${card.name} in ${deck.name}`}
        size="icon-sm"
        disabled={n >= 99}
        onClick={() => set(n + 1)}
      >
        <Plus />
      </IconButton>
    </li>
  )
}
