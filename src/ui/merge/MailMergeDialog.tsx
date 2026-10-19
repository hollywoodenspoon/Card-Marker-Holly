import { FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { currentCard } from '@/core/editor/selectors'
import { walk } from '@/core/model/tree'
import type { FieldElement, Id, MergeSettings, Template } from '@/core/model/types'
import { cn } from '@/lib/cn'
import type { SheetTable } from '@/storage/sheetFiles'
import {
  cell,
  cleanColumn,
  lettersFromHeaders,
  columnLetter,
  planMerge,
  rowsToRead,
  type Table,
} from '@/templates/mailMerge'
import { runMerge, setMergeColumns, setMergeSettings } from '@/templates/mergeCommands'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'

const KIND: Record<FieldElement['type'], string> = {
  text: 'text',
  imageField: 'image file name',
  iconRow: 'number',
}

/** Make cards from spreadsheet rows. */
export function MailMergeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Mail merge"
        description="Each spreadsheet row becomes a card. Template fields read the column they're tagged with."
        className="max-w-2xl"
      >
        {open && <MergeForm onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

/** Template fields with their column letters: one entry per field part. */
function fieldParts(templates: (Template | undefined)[]) {
  const out: { templateId: Id; el: FieldElement }[] = []
  const seen = new Set<string>()
  for (const t of templates) {
    if (!t) continue
    walk(t.elements, (e) => {
      if (e.type !== 'text' && e.type !== 'imageField' && e.type !== 'iconRow') return
      const key = t.side + ':' + e.fieldName
      if (seen.has(key)) return
      seen.add(key)
      out.push({ templateId: t.id, el: e })
    })
  }
  return out
}

/** The chosen templates with the dialog's column edits applied (for planning only). */
function withLetters(t: Template | undefined, edits: Record<Id, string | undefined>) {
  if (!t) return undefined
  const copy = structuredClone(t)
  walk(copy.elements, (e) => {
    if ('fieldName' in e && e.id in edits) e.mergeColumn = edits[e.id]
  })
  return copy
}

function MergeForm({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.doc!)
  const library = useEditor((s) => s.library)
  const card = useEditor(currentCard)
  const templates = Object.values(doc.templates).sort((a, b) => a.createdAt - b.createdAt)
  const fronts = templates.filter((t) => t.side === 'front')
  const backs = templates.filter((t) => t.side === 'back')

  const [sheets, setSheets] = useState<SheetTable[] | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [paste, setPaste] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [settings, setSettings] = useState<MergeSettings>(() => ({
    firstRow: 2,
    mode: 'merge',
    ...doc.project.merge,
    frontTemplateId:
      doc.project.merge?.frontTemplateId ?? card?.frontTemplateId ?? fronts[0]?.id ?? null,
    backTemplateId:
      doc.project.merge?.backTemplateId !== undefined
        ? doc.project.merge.backTemplateId
        : (card?.backTemplateId ?? backs[0]?.id ?? null),
  }))
  const [edits, setEdits] = useState<Record<Id, string | undefined>>({})
  const set = (patch: Partial<MergeSettings>) => setSettings((s) => ({ ...s, ...patch }))

  const table: Table = useMemo(() => sheets?.[sheetIndex]?.table ?? [], [sheets, sheetIndex])
  const front = settings.frontTemplateId ? doc.templates[settings.frontTemplateId] : undefined
  const back = settings.backTemplateId ? doc.templates[settings.backTemplateId] : undefined
  const parts = fieldParts([front, back])
  const letter = (el: FieldElement) => (el.id in edits ? edits[el.id] : el.mergeColumn)

  const plan = useMemo(() => {
    if (!table.length) return null
    const patched = { ...doc.templates }
    for (const t of [front, back]) if (t) patched[t.id] = withLetters(t, edits)!
    return planMerge(table, settings, {
      templates: patched,
      assets: Object.values(library.assets),
      cards: Object.values(doc.cards),
    })
  }, [table, settings, edits, doc.templates, doc.cards, library.assets, front, back])
  const firstRead = table.length ? rowsToRead(table, settings).rows[0] : undefined
  const headerLetters = table.length
    ? lettersFromHeaders(
        table[0],
        parts.map((p) => p.el.fieldName),
      )
    : {}
  const canUseHeaders = Object.keys(headerLetters).length > 0

  const load = async (get: () => Promise<SheetTable[]>) => {
    setError(null)
    setDone(null)
    setLoading(true)
    try {
      const s = await get()
      if (!s.length || !s.some((x) => x.table.length)) throw new Error('No rows found.')
      setSheets(s)
      setSheetIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }
  const pick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values'
    input.onchange = () => {
      const f = input.files?.[0]
      if (f) void load(async () => (await import('@/storage/sheetFiles')).readSheetFile(f))
    }
    input.click()
  }
  const loadPaste = () =>
    load(async () => {
      const { parseDelimited } = await import('@/storage/sheetFiles')
      return [{ name: 'Pasted cells', table: parseDelimited(paste) }]
    })

  const applyHeaders = () => {
    const next = { ...edits }
    for (const p of parts)
      if (headerLetters[p.el.fieldName]) next[p.el.id] = headerLetters[p.el.fieldName]
    setEdits(next)
    if (!settings.nameColumn) {
      const i = table[0].findIndex((h) => h.trim().toLowerCase() === 'name')
      if (i >= 0) set({ nameColumn: columnLetter(i) })
    }
  }

  const run = () => {
    if (!plan) return
    const byTemplate: Record<Id, Record<Id, string | undefined>> = {}
    for (const p of parts)
      if (p.el.id in edits) (byTemplate[p.templateId] ??= {})[p.el.id] = edits[p.el.id]
    if (Object.keys(byTemplate).length) setMergeColumns(byTemplate)
    setMergeSettings(settings)
    const r = runMerge(plan)
    setEdits({})
    setDone(
      `Done: ${r.added} card${r.added === 1 ? '' : 's'} added, ${r.updated} updated. Undo with Ctrl+Z (or the undo button).`,
    )
  }

  const colInput = (
    label: string,
    value: string | undefined,
    onChange: (v: string | undefined) => void,
    id: string,
  ) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="text-center uppercase"
        placeholder="—"
        maxLength={3}
        value={value ?? ''}
        onChange={(e) =>
          onChange(cleanColumn(e.target.value) ?? (e.target.value ? value : undefined))
        }
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* 1. data */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          1 · Spreadsheet
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={pick} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Upload />} Choose file
          </Button>
          <span className="text-xs text-muted-foreground">
            .xlsx, .csv or .tsv — or paste cells below
          </span>
        </div>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste cells copied from Excel or Google Sheets"
          aria-label="Paste cells"
          rows={2}
          className="w-full rounded-md border border-input bg-panel p-2 text-base outline-none focus-visible:border-accent md:text-sm"
        />
        {paste.trim() && (
          <Button size="sm" variant="secondary" className="self-start" onClick={loadPaste}>
            Use pasted cells
          </Button>
        )}
        {sheets && (
          <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="merge-source">
            <FileSpreadsheet className="size-4 text-accent" />
            {sheets.length > 1 ? (
              <NativeSelect
                aria-label="Sheet"
                className="w-auto"
                value={sheetIndex}
                onChange={(e) => setSheetIndex(Number(e.target.value))}
              >
                {sheets.map((s, i) => (
                  <option key={i} value={i}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <span>{sheets[0].name}</span>
            )}
            <span className="text-muted-foreground">· {table.length} rows</span>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      {/* 2. rows */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          2 · Rows
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="mm-first">First row</Label>
            <Input
              id="mm-first"
              type="number"
              inputMode="numeric"
              min={1}
              value={settings.firstRow ?? 2}
              onChange={(e) => set({ firstRow: Math.max(1, e.target.valueAsNumber || 1) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="mm-only">Only rows</Label>
            <Input
              id="mm-only"
              placeholder="all"
              value={settings.rows ?? ''}
              onChange={(e) => set({ rows: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="mm-skip">Skip rows</Label>
            <Input
              id="mm-skip"
              placeholder="none"
              value={settings.skip ?? ''}
              onChange={(e) => set({ skip: e.target.value })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Row 1 is the top row. Lists and ranges work, e.g. “2-20, 25”. Empty rows are skipped.
          {plan && ` Reading ${plan.rowsRead} row${plan.rowsRead === 1 ? '' : 's'}.`}
        </p>
      </section>

      {/* 3. templates + columns */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          3 · Templates and columns
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="mm-front">Front template</Label>
            <NativeSelect
              id="mm-front"
              value={settings.frontTemplateId ?? ''}
              onChange={(e) => set({ frontTemplateId: e.target.value || null })}
            >
              {fronts.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="mm-back">Back template</Label>
            <NativeSelect
              id="mm-back"
              value={settings.backTemplateId ?? ''}
              onChange={(e) => set({ backTemplateId: e.target.value || null })}
            >
              <option value="">No back</option>
              {backs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {colInput('Card name', settings.nameColumn, (v) => set({ nameColumn: v }), 'mm-name')}
          {colInput('Copies', settings.copiesColumn, (v) => set({ copiesColumn: v }), 'mm-copies')}
          {colInput(
            'Front column',
            settings.frontColumn,
            (v) => set({ frontColumn: v }),
            'mm-fcol',
          )}
          {colInput('Back column', settings.backColumn, (v) => set({ backColumn: v }), 'mm-bcol')}
        </div>
        <p className="text-xs text-muted-foreground">
          Optional columns. Front and back columns hold a template name per row; empty cells use the
          templates above.
        </p>

        <div className="mt-1 overflow-hidden rounded-lg border" data-testid="merge-columns">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-1.5">
            <span className="text-xs font-medium">Fields</span>
            {canUseHeaders && (
              <Button size="sm" variant="ghost" onClick={applyHeaders}>
                Use header names
              </Button>
            )}
          </div>
          {parts.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">These templates have no fields.</p>
          )}
          {parts.map(({ el }) => {
            const col = letter(el)
            const sample = firstRead && col ? cell(table, firstRead, col) : ''
            return (
              <div
                key={el.id}
                className="flex items-center gap-2 border-b px-3 py-1.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{el.fieldName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {KIND[el.type]}
                    {sample && (
                      <>
                        {' · '}
                        <span className="text-foreground">“{sample.replace(/\n/g, ' ⏎ ')}”</span>
                      </>
                    )}
                  </div>
                </div>
                <Input
                  aria-label={`Column for ${el.fieldName}`}
                  className={cn(
                    'w-16 shrink-0 text-center uppercase',
                    !col && 'text-muted-foreground',
                  )}
                  placeholder="—"
                  maxLength={3}
                  value={col ?? ''}
                  onChange={(e) =>
                    setEdits({
                      ...edits,
                      [el.id]: cleanColumn(e.target.value) ?? (e.target.value ? col : undefined),
                    })
                  }
                />
              </div>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Letters are saved on the template, and can also be set in its properties (“Spreadsheet
          column”). Fields without a letter keep their template default.
        </p>
      </section>

      {/* 4. mode + run */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          4 · Merge
        </h3>
        <Tabs
          value={settings.mode ?? 'merge'}
          onValueChange={(v) => set({ mode: v as 'merge' | 'add' })}
        >
          <TabsList className="w-full">
            <TabsTrigger value="merge">Update existing</TabsTrigger>
            <TabsTrigger value="add">Add as new</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          {settings.mode === 'add'
            ? 'Every row becomes a new card. Existing cards are not touched.'
            : 'Cards made from a row by an earlier merge are updated (only the tagged fields). Rows without a card become new cards. Nothing is deleted.'}
        </p>
        {plan && plan.issues.length > 0 && (
          <ul
            className="max-h-32 overflow-auto rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-warning"
            data-testid="merge-issues"
          >
            {plan.issues.slice(0, 20).map((i, k) => (
              <li key={k}>
                {i.row ? `Row ${i.row}: ` : ''}
                {i.message}
              </li>
            ))}
            {plan.issues.length > 20 && <li>…and {plan.issues.length - 20} more.</li>}
          </ul>
        )}
        {done && (
          <p role="status" className="text-sm text-accent">
            {done}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm" data-testid="merge-summary">
            {plan
              ? `Adds ${plan.adds} card${plan.adds === 1 ? '' : 's'}, updates ${plan.updates}`
              : 'Choose a spreadsheet to start.'}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={run} disabled={!plan || plan.cards.length === 0}>
              Run merge
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
