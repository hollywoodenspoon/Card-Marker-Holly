import {
  ChevronDown,
  Copy,
  GripVertical,
  Image,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  addCard,
  deleteCard,
  duplicateCard,
  moveCard,
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
import { useReorder } from '@/ui/components/useReorder'
import { CardThumb as LiveThumb } from '@/ui/canvas/CardThumb'
import { useUi } from '@/ui/uiStore'

export function CardsPanel({ onPicked }: { onPicked?: () => void }) {
  const cards = useEditor((s) => s.doc?.cards)
  const currentId = useEditor((s) => s.view.cardId)
  const [q, setQ] = useState('')
  const list = useMemo(
    () => (cards ? Object.values(cards).sort((a, b) => a.order - b.order) : []),
    [cards],
  )
  const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : list
  const { handleProps, rowRef, dragging } = useReorder((from, to) =>
    moveCard(filtered[from].id, to),
  )

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
        <div className="flex">
          <Button
            size="sm"
            className="rounded-r-none"
            onClick={() => addCard()}
            title="New card with the same templates and part toggles as the current card"
          >
            <Plus /> Card
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="rounded-l-none border-l border-white/20 px-2"
                aria-label="More ways to add a card"
              >
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addCard()}>
                New card using previous card's layout
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addCard({ blank: true })}>
                New card with default toggles
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-auto px-2 pb-3">
        {filtered.map((c, i) => (
          <li key={c.id} ref={rowRef(i)}>
            {dragging && dragging.over === i && dragging.from !== i && <DropLine />}
            <CardRow
              card={c}
              active={c.id === currentId}
              handle={q ? undefined : handleProps(i)}
              dragged={dragging?.from === i}
              onPick={() => {
                selectCard(c.id)
                onPicked?.()
              }}
            />
            {dragging && i === filtered.length - 1 && dragging.over === filtered.length && (
              <DropLine />
            )}
          </li>
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

const DropLine = () => <div className="mx-2 h-0.5 rounded bg-accent" />

function CardRow({
  card,
  active,
  onPick,
  handle,
  dragged,
}: {
  card: Card
  active: boolean
  onPick: () => void
  handle?: ReturnType<ReturnType<typeof useReorder>['handleProps']>
  dragged?: boolean
}) {
  const [renaming, setRenaming] = useState(false)
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-lg p-1 pr-0.5',
        active ? 'bg-accent-soft' : 'hover:bg-muted',
        dragged && 'opacity-50',
      )}
    >
      {handle ? (
        <span
          {...handle}
          role="button"
          aria-label={`Drag to reorder ${card.name}`}
          className="grid h-11 w-6 shrink-0 place-items-center text-muted-foreground"
        >
          <GripVertical className="size-3.5" />
        </span>
      ) : (
        <span className="w-1" />
      )}
      <button
        type="button"
        onClick={onPick}
        onDoubleClick={() => setRenaming(true)}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="flex shrink-0 gap-1">
          <LiveThumb card={card} side="front" heightPx={40} />
          <LiveThumb card={card} side="back" heightPx={40} className="opacity-80" />
        </span>
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
          <DropdownMenuItem onSelect={() => useUi.getState().setImageExport({ cardId: card.id })}>
            <Image /> Export as image…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem danger onSelect={() => deleteCard(card.id)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
