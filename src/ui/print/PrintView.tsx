import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FileDown,
  ListChecks,
  Loader2,
  Palette,
  Settings2,
} from '@/ui/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { HelpButton } from '@/help/HelpButton'
import { useEditor } from '@/core/editor/editorStore'
import type { Cmyk } from '@/print/color/cmyk'
import type { ColorEngine } from '@/print/color/engine'
import { buildPrintJob, pageSheet, type PrintJob } from '@/print/job'
import { paperOf } from '@/print/paper'
import { cn } from '@/lib/cn'
import { downloadBlob, safeFileName } from '@/ui/actions/download'
import { Button, IconButton } from '@/ui/components/ui/button'
import type { LayoutKind } from '@/ui/shell/useLayout'
import { useUi } from '@/ui/uiStore'
import { PrintList } from './PrintList'
import { PrintSettingsForm } from './PrintSettingsForm'
import { useEscapeToClose } from '@/ui/components/overlay'
import { usePanZoom } from '@/ui/components/usePanZoom'
import { ZoomBar } from '@/ui/components/ZoomBar'
import { SheetPreview } from './SheetPreview'
import { usePreviewBands } from './usePreviewBands'
import { useActiveProfile } from './cmykProfile'
import { notePrintOpened } from '@/ui/onboarding/firstRun'

/** Share of a sheet's colours that must print noticeably duller before the preview says so. */
const OUT_SHOWN = 0.001

/** Full-screen print view: sheet settings, preview of fronts and mirrored backs, PDF export. */
export function PrintView({ layout }: { layout: LayoutKind }) {
  const setOpen = useUi((s) => s.setPrintOpen)
  useEscapeToClose(() => setOpen(false))
  useEffect(() => {
    notePrintOpened()
  }, [])
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
  const tooBig = job.groups.filter((g) => !g.sheet.perSheet)
  const fileKind = fronts && withBacks ? 'cards' : fronts ? 'fronts' : 'backs'
  const cmyk = job.settings.colorMode === 'cmyk'
  const active = useActiveProfile(job.settings)
  // The CMYK preview's share of colours that will print noticeably duller, per side.
  const [outShare, setOutShare] = useState<Record<string, number>>({})
  const [markOut, setMarkOut] = useState(false)
  const out = Math.max(0, ...Object.values(outShare))
  const profileWaiting = cmyk && !active.profile && !active.error

  const exportCards = async () => {
    setError(null)
    setBusy('Preparing…')
    try {
      const { exportCardsPdf } = await import('@/print/pdf/exportPdf')
      const swatches = Object.fromEntries(
        Object.entries(job.settings.cmykSwatches).map(([hex, c]) => [
          hex,
          c.map((v) => v / 100) as Cmyk,
        ]),
      )
      const r = await exportCardsPdf(job, (d, t) => setBusy(`Page ${d} of ${t}…`), {
        profile: active.profile ?? undefined,
        swatches,
      })
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
      aria-modal="true"
      aria-label="Print"
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-panel px-2 md:h-12">
        <IconButton label="Back to editor" onClick={() => setOpen(false)}>
          <ArrowLeft />
        </IconButton>
        <HelpButton topic="printing" className="order-last" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Print</div>
          <div className="truncate text-xs text-muted-foreground" data-testid="print-summary">
            {job.groups.length > 1
              ? `${job.groups.length} card sizes`
              : `${job.sheet.perSheet} per sheet (${job.sheet.orientation})`}{' '}
            · {job.copyCount} card
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
          <Button
            size="sm"
            onClick={exportCards}
            disabled={!!busy || !pageCount || nothing || profileWaiting}
          >
            {busy ? <Loader2 className="animate-spin" /> : <FileDown />} {busy ?? 'Export PDF'}
          </Button>
        )}
      </header>

      <div className={cn('flex min-h-0 flex-1', phone ? 'flex-col' : 'flex-row')}>
        {!phone && (
          <aside className="w-80 shrink-0 overflow-auto border-r bg-panel">
            <PrintList sheets={pageCount} />
            <PrintSettingsForm sizes={job.groups.map((g) => g.card)} />
          </aside>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-canvas">
          {cmyk && (
            <div
              className="mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-panel p-3 text-sm"
              role="status"
              data-testid="print-cmyk-status"
            >
              <Palette className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                {active.error
                  ? `The printer profile could not be loaded: ${active.error}`
                  : active.profile
                    ? `CMYK preview · ${active.profile.name}`
                    : 'Loading the printer profile…'}
                {active.missingCustom && ' (no print shop profile on this device, so FOGRA39)'}
                {active.profile && (
                  <span className="block text-xs text-muted-foreground">
                    {out < OUT_SHOWN
                      ? 'The colours on this sheet print close to how they look on screen.'
                      : out < 0.01
                        ? 'A few colours on this sheet (under 1%) will print noticeably duller than on screen.'
                        : `About ${Math.round(out * 100)}% of the colours on this sheet will print noticeably duller than on screen.`}
                  </span>
                )}
              </span>
              {active.profile && out >= OUT_SHOWN && (
                <Button size="sm" variant="outline" onClick={() => setMarkOut(!markOut)}>
                  {markOut ? 'Hide' : 'Show where'}
                </Button>
              )}
            </div>
          )}
          {(error || warnings.length > 0 || tooBig.length > 0 || nothing) && (
            <div
              className="m-3 flex flex-col gap-1 rounded-lg border bg-panel p-3 text-sm"
              role="status"
            >
              {nothing && <p className="text-danger">None of these cards has a back template.</p>}
              {tooBig.map((g) => (
                <p key={`${g.card.w}x${g.card.h}`} className="text-danger">
                  {g.card.w} × {g.card.h} mm cards don't fit on {paperOf(job.settings.paper).label}{' '}
                  with these margins.
                </p>
              ))}
              {error && <p className="text-danger">Export failed: {error}</p>}
              {warnings.map((w) => (
                <p key={w} className="flex gap-1.5 text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}
          <Previews
            job={job}
            sheet={current}
            side={side}
            phone={phone}
            withBacks={withBacks}
            proof={active.profile?.engine ?? null}
            markOut={markOut}
            onOutOfRange={(s, share) =>
              setOutShare((o) => (o[s] === share ? o : { ...o, [s]: share }))
            }
          />
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
                      'h-11 rounded-md px-3 text-xs font-medium capitalize md:h-9',
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
                      <PrintList sheets={pageCount} />
                    ) : (
                      <PrintSettingsForm sizes={job.groups.map((g) => g.card)} />
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
                disabled={!!busy || !pageCount || nothing || profileWaiting}
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
  proof,
  markOut,
  onOutOfRange,
}: {
  job: PrintJob
  sheet: number
  side: 'front' | 'back'
  phone: boolean
  withBacks: boolean
  proof: ColorEngine | null
  markOut: boolean
  onOutOfRange: (side: 'front' | 'back', share: number) => void
}) {
  const group = job.groups[job.pageGroup[sheet]]
  const bands = usePreviewBands(job, group?.card)
  const [size, setSize] = useState({ w: 0, h: 0 })
  // Zoom is relative to "fit"; x / y pan the sheets from the centre.
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  // The sheets are redrawn at the new size once a zoom gesture settles (sharp);
  // in between, a CSS scale keeps it smooth.
  const [drawn, setDrawn] = useState(1)
  useEffect(() => {
    const t = setTimeout(() => setDrawn(view.zoom), 150)
    return () => clearTimeout(t)
  }, [view.zoom])
  const fit = () => setView({ zoom: 1, x: 0, y: 0 })
  const zoomBy = (f: number, at?: { x: number; y: number }) =>
    setView((v) => {
      const zoom = Math.min(8, Math.max(0.25, v.zoom * f))
      const k = zoom / v.zoom
      // Keep the point under the pointer in place (offsets are from the centre).
      const c = at ? { x: at.x - size.w / 2, y: at.y - size.h / 2 } : { x: 0, y: 0 }
      return { zoom, x: c.x - (c.x - v.x) * k, y: c.y - (c.y - v.y) * k }
    })
  const ref = useRef<HTMLDivElement>(null)
  const pz = usePanZoom(ref, {
    onZoom: zoomBy,
    onPan: (dx, dy) => setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
    onFit: fit,
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const fronts = job.sides.fronts
  const count = !phone && fronts && withBacks ? 2 : 1
  const layout = pageSheet(job, sheet)
  const aspect = layout.pageW / layout.pageH
  const gap = 24
  const labelH = 22
  const maxW = (size.w - gap * (count + 1)) / count
  // Room kept free at the bottom for the zoom bar, so it never covers a caption.
  const bar = 56
  const w = Math.max(0, Math.floor(Math.min(maxW, (size.h - gap * 2 - labelH - bar) * aspect)))
  // Both sides side by side on wider screens; phones show one at a time.
  const shown = (['front', 'back'] as const).filter((x) => (x === 'front' ? fronts : withBacks))
  const sides = phone && shown.length === 2 ? [side] : shown
  const shownW = Math.round(w * drawn)
  return (
    <div
      ref={ref}
      className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden"
      style={{ cursor: pz.cursor }}
      data-testid="print-preview"
      {...pz.handlers}
    >
      <div
        className="flex shrink-0 items-center justify-center gap-6"
        style={{
          transform: `translate(${view.x}px, ${view.y - bar / 2}px) scale(${view.zoom / drawn})`,
        }}
        data-testid="print-sheets"
      >
        {w > 0 &&
          job.pages.length > 0 &&
          sides.map((s) => (
            <figure key={s} className="flex flex-col items-center gap-1.5">
              <div
                className="shadow-xl"
                style={job.settings.draftGrey ? { filter: 'grayscale(1)' } : undefined}
              >
                <SheetPreview
                  job={job}
                  sheetIndex={sheet}
                  side={s}
                  widthPx={shownW}
                  bands={bands}
                  proof={proof}
                  markOut={markOut}
                  onOutOfRange={(share) => onOutOfRange(s, share)}
                />
              </div>
              <figcaption className="text-xs text-white/90">
                {s === 'front' ? 'Fronts' : `Backs (mirrored, ${job.settings.flip}-edge flip)`}
                {proof && ' · CMYK preview'}
                {job.groups.length > 1 && group && ` · ${group.card.w} × ${group.card.h} mm`}
              </figcaption>
            </figure>
          ))}
      </div>
      <ZoomBar zoom={view.zoom} onZoom={(f) => zoomBy(f)} onFit={fit} />
    </div>
  )
}
