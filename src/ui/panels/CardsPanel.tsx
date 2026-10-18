import { Copy, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  addCard,
  deleteCard,
  duplicateCard,
  renameCard,
  selectCard,
} from '@/core/editor/cardCommands'
import { useEditor } from '@/core/editor/editorStore'
import type { Card } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { Button, IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Input } from '@/ui/components/ui/input'

export function CardsPanel({ onPicked }: { onPicked?: () => void }) {
  const cards = useEditor((s) => s.doc?.cards)
  const currentId = useEditor((s) => s.view.cardId)
  const [q, setQ] = useState('')
  const list = useMemo(
    () => (cards ? Object.values(cards).sort((a, b) => a.order - b.order) : []),
    [cards],
  )
  const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : list

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cards"
            aria-label="Search cards"
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={() => addCard()} title="New card using this card's layout">
          <Plus /> Card
        </Button>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-auto px-2 pb-3">
        {filtered.map((c) => (
          <CardRow
            key={c.id}
            card={c}
            active={c.id === currentId}
            onPick={() => {
              selectCard(c.id)
              onPicked?.()
            }}
          />
        ))}
        {!filtered.length && (
          <li className="p-4 text-center text-sm text-muted-foreground">
            {q ? 'No cards match.' : 'No cards yet.'}
          </li>
        )}
      </ul>
    </div>
  )
}

function CardRow({ card, active, onPick }: { card: Card; active: boolean; onPick: () => void }) {
  const [renaming, setRenaming] = useState(false)
  return (
    <li
      className={cn(
        'group flex items-center gap-2 rounded-lg p-1 pr-0.5',
        active ? 'bg-accent-soft' : 'hover:bg-muted',
      )}
    >
      <button
        type="button"
        onClick={onPick}
        onDoubleClick={() => setRenaming(true)}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
      >
        <CardThumb card={card} />
        {!renaming && <span className="truncate text-sm">{card.name}</span>}
      </button>
      {renaming && (
        <Input
          autoFocus
          defaultValue={card.name}
          aria-label="Card name"
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== card.name) renameCard(card.id, v)
            setRenaming(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setRenaming(false)
          }}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label={`Options for ${card.name}`} size="icon-sm">
            <MoreHorizontal />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateCard(card.id)}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem danger onSelect={() => deleteCard(card.id)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

/** Placeholder thumbnail until rendered thumbnails arrive. */
function CardThumb({ card }: { card: Card }) {
  return (
    <span
      aria-hidden
      className="grid h-9 w-14 shrink-0 place-items-center rounded border bg-panel text-[10px] text-muted-foreground"
    >
      {card.name.slice(0, 2)}
    </span>
  )
}
