import { FileDown, Loader2 } from '@/ui/icons'
import { useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import type { Side } from '@/core/model/types'
import { cardSizeOf } from '@/print/job'
import {
  IMAGE_FORMATS,
  imagePx,
  type ImageExportOptions,
  type ImageFormat,
} from '@/print/image/imageFiles'
import { downloadBlob } from '@/ui/actions/download'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { useUi } from '@/ui/uiStore'

const DPIS = [150, 300, 600]

/** Options kept for the session, so a second export starts where the last one left off. */
let last: ImageExportOptions & { all: boolean } = {
  all: false,
  sides: ['front'],
  bleeds: [false],
  formats: ['png'],
  dpi: 300,
}

/** Export one card or all cards as PNG / JPG / WebP, trimmed and/or with bleed. */
export function ExportImagesDialog() {
  const state = useUi((s) => s.imageExport)
  const close = () => useUi.getState().setImageExport(null)
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && close()}>
      <DialogContent
        title="Export card images"
        description="Images are saved at their exact size, ready to print or share."
      >
        {state && <ExportForm cardId={state.cardId} onDone={close} />}
      </DialogContent>
    </Dialog>
  )
}

function ExportForm({ cardId, onDone }: { cardId: string | null; onDone: () => void }) {
  const doc = useEditor((s) => s.doc!)
  const library = useEditor((s) => s.library)
  const cards = Object.values(doc.cards)
  const one = cardId ? doc.cards[cardId] : undefined
  const [o, setO] = useState(() => ({ ...last, all: last.all || !one }))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const update = (patch: Partial<typeof o>) => {
    const next = { ...o, ...patch }
    last = next
    setO(next)
  }
  const toggle = <T,>(list: T[], v: T, on: boolean) =>
    on ? [...list.filter((x) => x !== v), v] : list.filter((x) => x !== v)

  const chosen = o.all || !one ? cards : [one]
  const { project } = doc
  const size = chosen[0]
    ? cardSizeOf(project, doc.templates, chosen[0])
    : { w: project.defaultSize.widthMm, h: project.defaultSize.heightMm }
  const count = chosen.length * o.sides.length * o.bleeds.length * o.formats.length
  const px = (withBleed: boolean) => imagePx(size, project.bleedMm, withBleed, o.dpi)

  const run = async () => {
    setError(null)
    setNote(null)
    setBusy('Preparing…')
    try {
      const { exportCardImages } = await import('@/print/image/exportImages')
      const r = await exportCardImages(
        {
          project,
          templates: doc.templates,
          cards: chosen,
          allCards: doc.cards,
          assets: library.assets,
          fonts: Object.values(library.fonts),
          stylePresets: doc.stylePresets,
        },
        {
          sides: (['front', 'back'] as Side[]).filter((s) => o.sides.includes(s)),
          bleeds: [false, true].filter((b) => o.bleeds.includes(b)),
          formats: IMAGE_FORMATS.map((f) => f.id).filter((f) => o.formats.includes(f)),
          dpi: o.dpi,
        },
        (d, t) => setBusy(`Image ${d} of ${t}…`),
      )
      downloadBlob(r.blob, r.name)
      if (r.noBack.length)
        setNote(`No back template, so no back image for: ${r.noBack.join(', ')}.`)
      else onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {one && (
        <Group label="Cards">
          <Tabs
            className="w-full"
            value={o.all ? 'all' : 'one'}
            onValueChange={(v) => update({ all: v === 'all' })}
          >
            <TabsList className="w-full">
              <TabsTrigger value="one" className="min-w-0">
                <span className="truncate">{one.name}</span>
              </TabsTrigger>
              <TabsTrigger value="all">All cards ({cards.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </Group>
      )}
      <Group label="Sides">
        {(['front', 'back'] as const).map((s) => (
          <Check
            key={s}
            label={s === 'front' ? 'Front' : 'Back'}
            checked={o.sides.includes(s)}
            onChange={(on) => update({ sides: toggle(o.sides, s, on) })}
          />
        ))}
      </Group>
      <Group label="Size">
        <Check
          label="Without bleed"
          hint={`${px(false).width} × ${px(false).height} px`}
          checked={o.bleeds.includes(false)}
          onChange={(on) => update({ bleeds: toggle(o.bleeds, false, on) })}
        />
        <Check
          label={`With ${project.bleedMm} mm bleed`}
          hint={`${px(true).width} × ${px(true).height} px`}
          disabled={project.bleedMm <= 0}
          checked={project.bleedMm > 0 && o.bleeds.includes(true)}
          onChange={(on) => update({ bleeds: toggle(o.bleeds, true, on) })}
        />
      </Group>
      <Group label="Formats">
        {IMAGE_FORMATS.map((f) => (
          <Check
            key={f.id}
            label={f.label}
            hint={f.id === 'jpg' ? 'white background' : 'keeps transparency'}
            checked={o.formats.includes(f.id)}
            onChange={(on) => update({ formats: toggle<ImageFormat>(o.formats, f.id, on) })}
          />
        ))}
      </Group>
      <Group label="Resolution">
        <Tabs
          className="w-full"
          value={String(o.dpi)}
          onValueChange={(v) => update({ dpi: Number(v) })}
        >
          <TabsList className="w-full">
            {DPIS.map((d) => (
              <TabsTrigger key={d} value={String(d)}>
                {d} dpi
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Group>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="text-sm text-warning">
          {note}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground" data-testid="image-export-summary">
          {count} file{count === 1 ? '' : 's'}
          {count > 1 ? ' · saved as one zip' : ''}
        </span>
        <Button onClick={run} disabled={!!busy || count === 0}>
          {busy ? <Loader2 className="animate-spin" /> : <FileDown />} {busy ?? 'Export'}
        </Button>
      </div>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-x-4">{children}</div>
    </fieldset>
  )
}

function Check({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm has-disabled:opacity-50 md:min-h-9">
      <input
        type="checkbox"
        className="size-4 accent-accent"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}
