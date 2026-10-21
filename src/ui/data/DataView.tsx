import { ArrowLeft, FileDown, Search, X } from '@/ui/icons'
import { memo, useCallback, useMemo, useState } from 'react'
import { HelpButton } from '@/help/HelpButton'
import { renameCard, selectCard } from '@/core/editor/cardCommands'
import { useEditor } from '@/core/editor/editorStore'
import { setCopies } from '@/core/editor/projectCommands'
import type { Asset, Card, Deck, Template } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { copiesOf } from '@/print/printList'
import { templateForCards } from '@/ui/actions/templateUse'
import {
  tableColumns,
  tableRow,
  toCsvRows,
  type TableCell,
  type TableColumn,
  type TableContext,
} from '@/templates/cardTable'
import { clearCardValue, setCardCount, setCardImage, setCardText } from '@/templates/fieldCommands'
import { downloadBlob } from '@/ui/actions/download'
import { CardThumb } from '@/ui/canvas/CardThumb'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, NativeSelect } from '@/ui/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { MergeForm } from '@/ui/merge/MailMergeDialog'
import { useEscapeToClose } from '@/ui/components/overlay'
import { useUi } from '@/ui/uiStore'

const NO_DECKS: Deck[] = []

/** Card data: every card's values as an editable table, CSV export, and mail merge import. */
export function DataView() {
  const tab = useUi((s) => s.dataView) ?? 'table'
  const setTab = useUi((s) => s.setDataView)
  const close = () => setTab(null)
  useEscapeToClose(close)
  const doc = useEditor((s) => s.doc!)
  const assets = useEditor((s) => s.library.assets)
  const decks = doc.project.decks ?? NO_DECKS
  const [deckId, setDeckId] = useState('')
  const [q, setQ] = useState('')
  const deck = decks.find((d) => d.id === deckId)
  const list = useMemo(
    () =>
      Object.values(doc.cards)
        .sort((a, b) => a.order - b.order)
        .filter(
          (c) =>
            (!deck || (deck.counts[c.id] ?? 0) > 0) &&
            (!q || c.name.toLowerCase().includes(q.toLowerCase())),
        ),
    [doc.cards, deck, q],
  )
  const computed = useMemo(
    () => tableColumns(list, doc.templates, doc.project.merge),
    [list, doc.templates, doc.project.merge],
  )
  // Same columns → same array, so typing in a cell doesn't re-render every row.
  const colKey = JSON.stringify(computed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => computed, [colKey])
  const openCard = useCallback(
    (c: Card) => {
      selectCard(c.id)
      setTab(null)
    },
    [setTab],
  )
  const print = doc.project.print
  const ctx: TableContext = useMemo(
    () => ({ templates: doc.templates, assets, copies: (id) => copiesOf(print, id) }),
    [doc.templates, assets, print],
  )

  const exportCsv = async () => {
    const { toCsv } = await import('@/storage/sheetFiles')
    const text = toCsv(toCsvRows(list, columns, ctx))
    const base = doc.project.name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'cards'
    downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), `${base} cards.csv`)
  }

  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Card data"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton label="Back to editor" onClick={close}>
          <ArrowLeft />
        </IconButton>
        <div className="mr-2 text-sm font-semibold">Card data</div>
        <HelpButton topic="card-data" />
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'table' | 'import')}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === 'table' && (
          <>
            <div className="relative min-w-32 flex-1 sm:max-w-56">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search"
                aria-label="Search cards"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {decks.length > 0 && (
              <NativeSelect
                aria-label="Deck"
                className="w-auto"
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
              >
                <option value="">All cards</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            )}
            <span className="text-xs text-muted-foreground" data-testid="data-count">
              {list.length} card{list.length === 1 ? '' : 's'}
            </span>
            <div className="flex-1" />
            <Button variant="outline" onClick={exportCsv} disabled={!list.length}>
              <FileDown /> Export CSV
            </Button>
          </>
        )}
      </header>
      {tab === 'table' ? (
        <DataTable list={list} columns={columns} ctx={ctx} onOpen={openCard} />
      ) : (
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Each spreadsheet row becomes a card. Template fields read the column they're tagged
              with. A CSV from <b>Export CSV</b> can be edited in Excel or Google Sheets and read
              back in here (choose <b>Add as new cards</b>, or edit in the Table directly).
            </p>
            <MergeForm onClose={() => setTab('table')} />
          </div>
        </main>
      )}
    </div>
  )
}

function DataTable({
  list,
  columns,
  ctx,
  onOpen,
}: {
  list: Card[]
  columns: TableColumn[]
  ctx: TableContext
  onOpen: (c: Card) => void
}) {
  // The name column stays first on screen (and sticky), wherever it sits in the export.
  const shown = useMemo(
    () => [
      ...columns.filter((c) => c.kind === 'name'),
      ...columns.filter((c) => c.kind !== 'name'),
    ],
    [columns],
  )
  const templates = useMemo(
    () => Object.values(ctx.templates).sort((a, b) => a.createdAt - b.createdAt),
    [ctx.templates],
  )
  // Sorted once for every art cell's picker.
  const assets = useMemo(
    () => Object.values(ctx.assets).sort((a, b) => a.name.localeCompare(b.name)),
    [ctx.assets],
  )
  if (!list.length)
    return <p className="p-8 text-center text-sm text-muted-foreground">No cards to show.</p>
  return (
    <main className="min-h-0 flex-1 overflow-auto overscroll-contain" data-testid="data-table">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {shown.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'sticky top-0 z-10 border-r border-b bg-panel px-2 py-1.5 text-left font-medium whitespace-nowrap',
                  i === 0 && 'left-0 z-20',
                )}
              >
                {c.label}{' '}
                <span className="font-mono text-[10px] text-muted-foreground" title="CSV column">
                  {c.letter}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((card) => (
            <DataRow
              key={card.id}
              card={card}
              columns={columns}
              shown={shown}
              ctx={ctx}
              templates={templates}
              assets={assets}
              onOpen={onOpen}
            />
          ))}
        </tbody>
      </table>
    </main>
  )
}

/** One card's row. Memoized: typing in one cell re-renders only that card's row. */
const DataRow = memo(function DataRow({
  card,
  columns,
  shown,
  ctx,
  templates,
  assets,
  onOpen,
}: {
  card: Card
  columns: TableColumn[]
  shown: TableColumn[]
  ctx: TableContext
  templates: Template[]
  assets: Asset[]
  onOpen: (c: Card) => void
}) {
  const byKey = useMemo(() => {
    const cells = tableRow(card, columns, ctx)
    return new Map(columns.map((c, i) => [c.key, cells[i]]))
  }, [card, columns, ctx])
  return (
    <tr
      data-testid="data-row"
      // Rows far off screen skip layout and paint.
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 48px' }}
    >
      {shown.map((col, i) => (
        <td
          key={col.key}
          className={cn(
            'border-r border-b p-1 align-top',
            i === 0 && 'sticky left-0 z-[5] bg-panel',
            !byKey.get(col.key)!.has && 'bg-muted/60',
          )}
        >
          {i === 0 ? (
            <NameCell card={card} onOpen={() => onOpen(card)} />
          ) : (
            <ValueCell
              card={card}
              col={col}
              cell={byKey.get(col.key)!}
              templates={templates}
              assets={assets}
            />
          )}
        </td>
      ))}
    </tr>
  )
})

function NameCell({ card, onOpen }: { card: Card; onOpen: () => void }) {
  return (
    <div className="flex w-40 items-center gap-1.5 sm:w-52">
      <button
        type="button"
        onClick={onOpen}
        title={`Open ${card.name}`}
        className="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-accent"
      >
        <CardThumb card={card} side="front" heightPx={32} />
      </button>
      <Input
        key={card.name}
        aria-label={`Name of ${card.name}`}
        defaultValue={card.name}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v && v !== card.name) renameCard(card.id, v)
          else e.target.value = card.name
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </div>
  )
}

function ValueCell({
  card,
  col,
  cell,
  templates,
  assets,
}: {
  card: Card
  col: TableColumn
  cell: TableCell
  templates: Template[]
  assets: Asset[]
}) {
  const label = `${col.label} of ${card.name}`
  if (!cell.has)
    return (
      <span className="block px-1 py-1.5 text-muted-foreground" title="Not on this card's template">
        —
      </span>
    )
  if (col.kind === 'front' || col.kind === 'back') {
    const side = col.kind
    const current = side === 'front' ? card.frontTemplateId : card.backTemplateId
    return (
      <NativeSelect
        aria-label={label}
        className="w-40"
        value={current ?? ''}
        onChange={(e) => templateForCards([card.id], side, e.target.value || null)}
      >
        <option value="">None</option>
        {templates
          .filter((t) => t.side === side)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </NativeSelect>
    )
  }
  if (col.kind === 'copies')
    return (
      <Input
        type="number"
        min={0}
        max={99}
        aria-label={label}
        className="w-20"
        value={cell.value}
        onChange={(e) => setCopies(card.id, Number(e.target.value))}
      />
    )
  const field = col.field!
  const clear = field in card.fields && (
    <IconButton
      label={`Clear ${label}`}
      size="icon-sm"
      className="shrink-0"
      onClick={() => clearCardValue(card.id, field)}
    >
      <X />
    </IconButton>
  )
  if (col.kind === 'image') {
    const own = card.fields[field]
    return (
      <div className="flex w-48 items-center gap-1">
        <NativeSelect
          aria-label={label}
          value={own?.kind === 'image' ? own.assetId : ''}
          onChange={(e) =>
            e.target.value
              ? setCardImage(card.id, field, e.target.value)
              : clearCardValue(card.id, field)
          }
        >
          <option value="">{cell.fallback ? `Default: ${cell.fallback}` : 'None'}</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
        {clear}
      </div>
    )
  }
  if (col.kind === 'count')
    return (
      <div className="flex w-28 items-center gap-1">
        <Input
          type="number"
          min={0}
          max={99}
          aria-label={label}
          value={cell.value}
          placeholder={cell.fallback}
          onChange={(e) =>
            e.target.value === ''
              ? clearCardValue(card.id, field)
              : setCardCount(card.id, field, Number(e.target.value))
          }
        />
        {clear}
      </div>
    )
  return (
    <div className="flex w-64 items-start gap-1">
      <textarea
        aria-label={label}
        spellCheck
        rows={Math.min(4, Math.max(1, (cell.value || cell.fallback).split('\n').length))}
        readOnly={!cell.editable}
        title={cell.editable ? undefined : 'Formatted text: edit it on the card'}
        value={cell.value}
        placeholder={cell.fallback}
        onChange={(e) => setCardText(card.id, field, e.target.value)}
        className={cn(
          'min-h-9 w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-base outline-none focus-visible:border-accent md:text-sm',
          !cell.editable && 'text-muted-foreground italic',
        )}
      />
      {clear}
    </div>
  )
}
