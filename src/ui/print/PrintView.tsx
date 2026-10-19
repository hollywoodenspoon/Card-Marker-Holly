import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FileDown,
  ListChecks,
  Loader2,
  Settings2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { buildPrintJob, type PrintJob } from '@/print/job'
import { paperOf } from '@/print/paper'
import { cn } from '@/lib/cn'
import { downloadBlob, safeFileName } from '@/ui/actions/download'
import { Button, IconButton } from '@/ui/components/ui/button'
import type { LayoutKind } from '@/ui/shell/useLayout'
import { useUi } from '@/ui/uiStore'
import { PrintList } from './PrintList'
import { PrintSettingsForm } from './PrintSettingsForm'
import { SheetPreview } from './SheetPreview'
import { usePreviewBands } from './usePreviewBands'

/** Full-screen print view: sheet settings, preview of fronts and mirrored backs, PDF export. */
export function PrintView({ layout }: { layout: LayoutKind }) {
  const setOpen = useUi((s) => s.setPrintOpen)
  const doc = useEditor((s) => s.doc!)
  const library = useEditor((s) => s.library)
  const job = useMemo(
    () =>
      buildPrintJob({
        project: doc.project,
        templates: doc.templates,
        cards: Object.values(doc.cards),
        assets: library.assets,
        fonts: Object.values(library.fonts),
        stylePresets: doc.stylePresets,
      }),
    [doc, library],
  )
  const [sheet, setSheet] = useState(0)
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [busy, setBusy] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [phonePanel, setPhonePanel] = useState<'cards' | 'settings' | null>(null)
  const phone = layout === 'phone'
  const pageCount = job.pages.length
  const current = Math.min(sheet, Math.max(0, pageCount - 1))
  const { fronts, backs: withBacks } = job.sides
  const nothing = !fronts && !withBacks
  const fileKind = fronts && withBacks ? 'cards' : fronts ? 'fronts' : 'backs'

  const exportCards = async () => {
    setError(null)
    setBusy('Preparing…')
    try {
      const { exportCardsPdf } = await import('@/print/pdf/exportPdf')
      const r = await exportCardsPdf(job, (d, t) => setBusy(`Page ${d} of ${t}…`))
      setWarnings(r.warnings)
      downloadBlob(r.blob, `${safeFileName(doc.project.name)} - ${fileKind}.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }
  const exportTest = async () => {
    setError(null)
    setBusy('Preparing…')
    try {
      const { exportAlignmentPdf } = await import('@/print/pdf/exportPdf')
      downloadBlob(
        await exportAlignmentPdf(job),
        `${safeFileName(doc.project.name)} - alignment test.pdf`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-label="Print"
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-panel px-2 md:h-12">
        <IconButton label="Back to editor" onClick={() => setOpen(false)}>
          <ArrowLeft />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Print</div>
          <div className="truncate text-xs text-muted-foreground" data-testid="print-summary">
            {job.sheet.perSheet} per sheet ({job.sheet.orientation}) · {job.copyCount} card
            {job.copyCount === 1 ? '' : 's'} · {pageCount} sheet{pageCount === 1 ? '' : 's'}
            {fronts && withBacks ? ' + backs' : fronts ? ' · fronts only' : ' · backs only'}
          </div>
        </div>
        {!phone && (
          <Button variant="outline" size="sm" onClick={exportTest} disabled={!!busy}>
            <Crosshair /> Alignment test
          </Button>
        )}
        {!phone && (
          <Button size="sm" onClick={exportCards} disabled={!!busy || !pageCount || nothing}>
            {busy ? <Loader2 className="animate-spin" /> : <FileDown />} {busy ?? 'Export PDF'}
          </Button>
        )}
      </header>

      <div className={cn('flex min-h-0 flex-1', phone ? 'flex-col' : 'flex-row')}>
        {!phone && (
          <aside className="w-80 shrink-0 overflow-auto border-r bg-panel">
            <PrintList perSheet={job.sheet.perSheet} />
            <PrintSettingsForm />
          </aside>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-canvas">
          {(error || warnings.length > 0 || job.sheet.perSheet === 0 || nothing) && (
            <div
              className="m-3 flex flex-col gap-1 rounded-lg border bg-panel p-3 text-sm"
              role="status"
            >
              {nothing && <p className="text-danger">None of these cards has a back template.</p>}
              {job.sheet.perSheet === 0 && (
                <p className="text-danger">
                  The card doesn't fit on {paperOf(job.settings.paper).label} with these margins.
                </p>
              )}
              {error && <p className="text-danger">Export failed: {error}</p>}
              {warnings.map((w) => (
                <p key={w} className="flex gap-1.5 text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}
          <Previews job={job} sheet={current} side={side} phone={phone} withBacks={withBacks} />
          <div className="flex shrink-0 items-center justify-center gap-2 p-2">
            <IconButton
              label="Previous sheet"
              variant="secondary"
              disabled={current <= 0}
              onClick={() => setSheet(current - 1)}
            >
              <ChevronLeft />
            </IconButton>
            <span className="min-w-24 text-center text-sm text-white tabular-nums">
              Sheet {pageCount ? current + 1 : 0} of {pageCount}
            </span>
            <IconButton
              label="Next sheet"
              variant="secondary"
              disabled={current >= pageCount - 1}
              onClick={() => setSheet(current + 1)}
            >
              <ChevronRight />
            </IconButton>
            {phone && fronts && withBacks && (
              <div className="ml-2 inline-flex rounded-lg bg-panel p-0.5">
                {(['front', 'back'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={cn(
                      'h-10 rounded-md px-3 text-xs font-medium capitalize',
                      side === s && 'bg-accent text-accent-foreground',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
        {phone && (
          <div className="shrink-0 border-t bg-panel">
            {(
              [
                ['cards', 'Cards to print', ListChecks],
                ['settings', 'Print settings', Settings2],
              ] as const
            ).map(([id, label, Icon]) => (
              <div key={id} className="border-b">
                <button
                  type="button"
                  aria-expanded={phonePanel === id}
                  onClick={() => setPhonePanel(phonePanel === id ? null : id)}
                  className="flex h-12 w-full items-center gap-2 px-4 text-sm font-medium"
                >
                  <Icon className="size-4" /> {label}
                  <ChevronRight
                    className={cn(
                      'ml-auto size-4 transition-transform',
                      phonePanel === id && 'rotate-90',
                    )}
                  />
                </button>
                {phonePanel === id && (
                  <div className="max-h-[40dvh] overflow-auto border-t">
                    {id === 'cards' ? (
                      <PrintList perSheet={job.sheet.perSheet} />
                    ) : (
                      <PrintSettingsForm />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-2 p-3">
              <Button variant="outline" className="flex-1" onClick={exportTest} disabled={!!busy}>
                <Crosshair /> Test page
              </Button>
              <Button
                className="flex-[2]"
                onClick={exportCards}
                disabled={!!busy || !pageCount || nothing}
              >
                {busy ? <Loader2 className="animate-spin" /> : <FileDown />} {busy ?? 'Export PDF'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Fit the sheet previews into the available space. */
function Previews({
  job,
  sheet,
  side,
  phone,
  withBacks,
}: {
  job: PrintJob
  sheet: number
  side: 'front' | 'back'
  phone: boolean
  withBacks: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const bands = usePreviewBands(job)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const fronts = job.sides.fronts
  const count = !phone && fronts && withBacks ? 2 : 1
  const aspect = job.sheet.pageW / job.sheet.pageH
  const gap = 24
  const labelH = 22
  const maxW = (size.w - gap * (count + 1)) / count
  const w = Math.max(0, Math.floor(Math.min(maxW, (size.h - gap * 2 - labelH) * aspect)))
  // Both sides side by side on wider screens; phones show one at a time.
  const shown = (['front', 'back'] as const).filter((x) => (x === 'front' ? fronts : withBacks))
  const sides = phone && shown.length === 2 ? [side] : shown
  return (
    <div
      ref={ref}
      className="flex min-h-0 flex-1 items-center justify-center gap-6 overflow-hidden"
      data-testid="print-preview"
    >
      {w > 0 &&
        job.pages.length > 0 &&
        sides.map((s) => (
          <figure key={s} className="flex flex-col items-center gap-1.5">
            <div
              className="shadow-xl"
              style={job.settings.draftGrey ? { filter: 'grayscale(1)' } : undefined}
            >
              <SheetPreview job={job} sheetIndex={sheet} side={s} widthPx={w} bands={bands} />
            </div>
            <figcaption className="text-xs text-white/90">
              {s === 'front' ? 'Fronts' : `Backs (mirrored, ${job.settings.flip}-edge flip)`}
            </figcaption>
          </figure>
        ))}
    </div>
  )
}
