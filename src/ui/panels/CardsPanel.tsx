import {
  Check,
  ChevronDown,
  Copy,
  LayoutTemplate,
  FileSpreadsheet,
  GripVertical,
  Image,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Trash2,
} from '@/ui/icons'
import { clickWord } from '@/lib/pointer'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Input } from '@/ui/components/ui/input'
import { useReorder } from '@/ui/components/useReorder'
import { CardThumb as LiveThumb } from '@/ui/canvas/CardThumb'
import { BulkBar } from './BulkBar'
import { useUi } from '@/ui/uiStore'
import { deletedToast } from '@/ui/actions/undoToast'
import { pickTemplateForCard } from '@/ui/actions/templateUse'
import { askText } from '@/ui/components/feedback'
import { saveCurrentCardAsTemplate } from '@/templates/commands'

export function CardsPanel({ onPicked }: { onPicked?: () => void }) {
  const cards = useEditor((s) => s.doc?.cards)
  const currentId = useEditor((s) => s.view.cardId)
  const [q, setQ] = useState('')
  // Select mode: tick several cards and change them together.
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const list = useMemo(
    () => (cards ? Object.values(cards).sort((a, b) => a.order - b.order) : []),
    [cards],
  )
  const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : list
  const { handleProps, rowRef, dragging } = useReorder((from, to) =>
    moveCard(filtered[from].id, to),
  )
  // One stable click handler for every row, so rows that didn't change don't re-render.
  const pickState = useRef({ picked, onPicked })
  useEffect(() => {
    pickState.current = { picked, onPicked }
  })
  const pick = useCallback((id: string) => {
    if (pickState.current.picked)
      return setPicked((p) => {
        const n = new Set(p)
        if (n.has(id)) n.delete(id)
        else n.add(id)
        return n
      })
    selectCard(id)
    pickState.current.onPicked?.()
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label="Search cards"
            className="pl-8"
          />
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          variant={picked ? 'default' : 'outline'}
          aria-pressed={!!picked}
          onClick={() => setPicked(picked ? null : new Set())}
          title="Select several cards to change them together"
        >
          {picked ? 'Done' : 'Select'}
        </Button>
        <div className="flex">
          <Button
            size="sm"
            className="rounded-r-none"
            onClick={() => addCard()}
            title="New card with the same templates and shown parts as the current card"
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
                New card like the current one
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addCard({ blank: true })}>
                New card with the template's defaults
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => useUi.getState().setDataView('import')}>
                <FileSpreadsheet /> Mail merge from spreadsheet…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {picked && (
        <div className="flex items-center gap-2 px-3 pb-2 text-xs text-muted-foreground">
          {clickWord() === 'tap' ? 'Tap' : 'Click'} cards to select them.
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPicked(new Set(filtered.map((c) => c.id)))}
          >
            All
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
            None
          </Button>
        </div>
      )}
      <ul className="min-h-0 flex-1 space-y-1 overflow-auto px-2 pb-3">
        {filtered.map((c, i) => (
          <li key={c.id} ref={rowRef(i)}>
            {dragging && dragging.over === i && dragging.from !== i && <DropLine />}
            <CardRow
              card={c}
              index={i}
              active={picked ? picked.has(c.id) : c.id === currentId}
              handleProps={q || picked ? undefined : handleProps}
              dragged={dragging?.from === i}
              checked={picked ? picked.has(c.id) : undefined}
              onPick={pick}
            />
            {dragging && i === filtered.length - 1 && dragging.over === filtered.length && (
              <DropLine />
            )}
          </li>
        ))}
        {!filtered.length && (
          <li className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted-foreground">
            {q ? (
              'No cards match.'
            ) : (
              <>
                No cards yet.
                <Button size="sm" onClick={() => addCard()}>
                  <Plus /> Add your first card
                </Button>
              </>
            )}
          </li>
        )}
      </ul>
      {picked && (
        <BulkBar
          ids={list.filter((c) => picked.has(c.id)).map((c) => c.id)}
          onDone={(keep) => keep && setPicked(new Set(keep))}
        />
      )}
    </div>
  )
}

const DropLine = () => <div className="mx-2 h-0.5 rounded bg-accent" />

const CardRow = memo(function CardRow({
  card,
  index,
  active,
  onPick: pickId,
  handleProps,
  dragged,
  checked,
}: {
  card: Card
  index: number
  active: boolean
  onPick: (id: string) => void
  handleProps?: ReturnType<typeof useReorder>['handleProps']
  dragged?: boolean
  /** Select mode: shown as a tick box. */
  checked?: boolean
}) {
  const [renaming, setRenaming] = useState(false)
  const side = useEditor((s) => s.view.side)
  const handle = handleProps?.(index)
  const onPick = () => pickId(card.id)
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-lg p-1 pr-0.5',
        active ? 'bg-accent-soft' : 'hover:bg-muted',
        dragged && 'opacity-50',
      )}
    >
      {checked !== undefined ? (
        <span className="grid h-11 w-6 shrink-0 place-items-center">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={checked}
            onChange={onPick}
            aria-label={`Select ${card.name}`}
          />
        </span>
      ) : handle ? (
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
          <ChangeTemplateMenu card={card} />
          <DropdownMenuItem onSelect={() => void saveAsTemplate(card)}>
            <Save /> Save {side} as template…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            danger
            onSelect={() => {
              deleteCard(card.id)
              deletedToast(`“${card.name}”`)
            }}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

/** This card's layout as a new template (the side being shown), named by the user. */
async function saveAsTemplate(card: Card) {
  selectCard(card.id)
  const side = useEditor.getState().view.side
  const name = await askText({
    title: `Save this card's ${side} as a template`,
    label: 'Template name',
    initial: `${card.name} ${side}`,
    okLabel: 'Save template',
  })
  if (name?.trim()) saveCurrentCardAsTemplate(name.trim())
}

/** Change template ▸ Front / Back: every template of that side, the current one ticked. */
function ChangeTemplateMenu({ card }: { card: Card }) {
  const templates = useEditor((s) => s.doc?.templates)
  const list = Object.values(templates ?? {}).sort((a, b) => a.createdAt - b.createdAt)
  const pick = (id: string) => {
    selectCard(card.id)
    pickTemplateForCard(id)
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <LayoutTemplate /> Change template
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {(['front', 'back'] as const).map((side) => (
          <div key={side}>
            <DropdownMenuLabel>{side === 'front' ? 'Front' : 'Back'}</DropdownMenuLabel>
            {list
              .filter((t) => t.side === side)
              .map((t) => {
                const on = (side === 'front' ? card.frontTemplateId : card.backTemplateId) === t.id
                return (
                  <DropdownMenuItem key={t.id} onSelect={() => !on && pick(t.id)}>
                    <Check className={on ? '' : 'invisible'} /> {t.name}
                  </DropdownMenuItem>
                )
              })}
          </div>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
