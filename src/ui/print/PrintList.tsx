import { GripVertical, Minus, Plus } from '@/ui/icons'
import { useMemo } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { deckSize, setPrintDeck } from '@/templates/deckCommands'
import { MAX_COPIES, setAllCopies, setCopies, setPrintOrder } from '@/core/editor/projectCommands'
import type { Card } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { movedOrder, printEntries } from '@/print/printList'
import { CardThumb } from '@/ui/canvas/CardThumb'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { useReorder } from '@/ui/components/useReorder'

/** Which cards print, how many of each, and in what order. */
export function PrintList({ perSheet }: { perSheet: number }) {
  const cards = useEditor((s) => s.doc!.cards)
  const print = useEditor((s) => s.doc!.project.print)
  const decks = useEditor((s) => s.doc!.project.decks)
  const deck = print.deckId ? decks?.find((d) => d.id === print.deckId) : undefined
  const entries = useMemo(() => printEntries(Object.values(cards), print), [cards, print])
  const total = entries.reduce((n, e) => n + e.copies, 0)
  const sheets = perSheet > 0 ? Math.ceil(total / perSheet) : 0
  const ids = entries.map((e) => e.card.id)
  const { handleProps, rowRef, dragging } = useReorder((from, to) =>
    setPrintOrder(movedOrder(entries, from, to)),
  )

  const source = decks?.length ? (
    <div className="mb-2 flex flex-col gap-1">
      <Label htmlFor="print-source">Print</Label>
      <NativeSelect
        id="print-source"
        value={deck?.id ?? ''}
        onChange={(e) => setPrintDeck(e.target.value || null)}
      >
        <option value="">Cards to print (this list)</option>
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            Deck: {d.name} ({deckSize(d)})
          </option>
        ))}
      </NativeSelect>
    </div>
  ) : null

  if (deck) {
    const n = deckSize(deck)
    const sh = perSheet > 0 ? Math.ceil(n / perSheet) : 0
    return (
      <section className="border-b px-4 py-3" aria-label="Cards to print">
        {source}
        <p className="text-xs text-muted-foreground" data-testid="print-list-summary">
          Printing deck “{deck.name}”: {n} card{n === 1 ? '' : 's'} · {sh} sheet
          {sh === 1 ? '' : 's'}. Change its counts in the Decks panel.
        </p>
      </section>
    )
  }

  return (
    <section className="border-b px-4 py-3" aria-labelledby="print-list-title">
      {source}
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3
          id="print-list-title"
          className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Cards to print
        </h3>
        <div className="flex">
          <Button size="sm" variant="ghost" onClick={() => setAllCopies(ids, 1)}>
            All
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAllCopies(ids, 0)}>
            None
          </Button>
        </div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground" data-testid="print-list-summary">
        {total} cop{total === 1 ? 'y' : 'ies'} · {sheets} sheet{sheets === 1 ? '' : 's'}
        {print.order ? ' · custom order' : ' · Cards list order'}
      </p>
      {print.order && (
        <Button
          size="sm"
          variant="outline"
          className="mb-2 w-full"
          onClick={() => setPrintOrder(null)}
        >
          Use Cards list order
        </Button>
      )}
      <ul className="-mx-2 flex flex-col gap-0.5" aria-label="Print order">
        {entries.map((e, i) => (
          <li key={e.card.id} ref={rowRef(i)}>
            {dragging && dragging.over === i && dragging.from !== i && <DropLine />}
            <PrintRow
              card={e.card}
              copies={e.copies}
              handle={handleProps(i)}
              dragged={dragging?.from === i}
            />
            {dragging && i === entries.length - 1 && dragging.over === entries.length && (
              <DropLine />
            )}
          </li>
        ))}
        {!entries.length && (
          <li className="p-3 text-center text-sm text-muted-foreground">No cards yet.</li>
        )}
      </ul>
    </section>
  )
}

const DropLine = () => <div className="mx-2 h-0.5 rounded bg-accent" />

function PrintRow({
  card,
  copies,
  handle,
  dragged,
}: {
  card: Card
  copies: number
  handle: ReturnType<ReturnType<typeof useReorder>['handleProps']>
  dragged: boolean
}) {
  const off = copies === 0
  return (
    <div
      className={cn('flex items-center gap-1 rounded-lg py-0.5 pr-1', dragged && 'opacity-50')}
      data-testid="print-row"
    >
      <span
        {...handle}
        role="button"
        aria-label={`Drag to change print position of ${card.name}`}
        className="grid h-11 w-6 shrink-0 place-items-center text-muted-foreground"
      >
        <GripVertical className="size-3.5" />
      </span>
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="size-4 shrink-0 accent-accent"
          checked={!off}
          onChange={(e) => setCopies(card.id, e.target.checked ? Math.max(1, copies) : 0)}
          aria-label={`Print ${card.name}`}
        />
        <CardThumb
          card={card}
          side="front"
          heightPx={36}
          className={cn('shrink-0', off && 'opacity-40')}
        />
        <span className={cn('truncate text-sm', off && 'text-muted-foreground line-through')}>
          {card.name}
        </span>
      </label>
      <div
        className="flex shrink-0 items-center"
        role="group"
        aria-label={`Copies of ${card.name}`}
      >
        <IconButton
          label={`Fewer copies of ${card.name}`}
          size="icon-sm"
          disabled={copies <= 0}
          onClick={() => setCopies(card.id, copies - 1)}
        >
          <Minus />
        </IconButton>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_COPIES}
          value={copies}
          onChange={(e) => setCopies(card.id, e.target.valueAsNumber)}
          onFocus={(e) => e.target.select()}
          aria-label={`Copies of ${card.name}`}
          className="h-11 w-11 rounded-md border md:h-9 md:w-9 bg-background text-center text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <IconButton
          label={`More copies of ${card.name}`}
          size="icon-sm"
          disabled={copies >= MAX_COPIES}
          onClick={() => setCopies(card.id, copies + 1)}
        >
          <Plus />
        </IconButton>
      </div>
    </div>
  )
}
