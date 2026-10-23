import { useEditor } from '@/core/editor/editorStore'
import { setBleed, setPrintSettings } from '@/core/editor/projectCommands'
import type { PrintSettings } from '@/core/model/types'
import { capacity } from '@/print/layout'
import { sheetInput } from '@/print/job'
import { PAPERS, paperOf, type PaperId } from '@/print/paper'
import { normalizePrint } from '@/print/settings'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { Switch } from '@/ui/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { NumberField, Row, Section } from '@/ui/components/fields'
import { ColorSettings } from './ColorSettings'

const set = (patch: Partial<PrintSettings>, key?: string) =>
  setPrintSettings(patch, key && 'print:' + key)

/** `sizes`: the card sizes being printed (each gets its own sheets). */
export function PrintSettingsForm({ sizes }: { sizes: { w: number; h: number }[] }) {
  const project = useEditor((s) => s.doc!.project)
  const p = normalizePrint(project.print)
  const shown = sizes.length
    ? sizes
    : [{ w: project.defaultSize.widthMm, h: project.defaultSize.heightMm }]
  // Cards per sheet in each orientation, one number per size ("9 / 4").
  const per = (o: 'portrait' | 'landscape') =>
    shown.map((c) => capacity(sheetInput(project, p, c), o).perSheet).join(' / ')
  const por = per('portrait')
  const lan = per('landscape')
  return (
    <div>
      <Section title="Sheet">
        <div className="flex flex-col gap-1">
          <Label htmlFor="print-paper">Paper</Label>
          <NativeSelect
            id="print-paper"
            value={p.paper}
            onChange={(e) => set({ paper: e.target.value })}
          >
            {(Object.keys(PAPERS) as PaperId[]).map((id) => (
              <option key={id} value={id}>
                {PAPERS[id].label} — {PAPERS[id].w} × {PAPERS[id].h} mm
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            {paperOf(p.paper).label} · {shown.map((c) => `${c.w} × ${c.h}`).join(' and ')} mm cards
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Orientation</Label>
          <Tabs
            value={p.orientation}
            onValueChange={(v) => set({ orientation: v as PrintSettings['orientation'] })}
          >
            <TabsList className="w-full">
              <TabsTrigger value="auto" className="px-1 text-xs whitespace-nowrap">
                Best fit
              </TabsTrigger>
              <TabsTrigger value="portrait" className="px-1 text-xs whitespace-nowrap">
                Portrait · {por}
              </TabsTrigger>
              <TabsTrigger value="landscape" className="px-1 text-xs whitespace-nowrap">
                Landscape · {lan}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Row>
          <NumberField
            label="Printer margin"
            unit="mm"
            min={0}
            max={30}
            step={0.5}
            value={p.marginMm}
            onChange={(v) => set({ marginMm: v }, 'margin')}
          />
          <NumberField
            label="Bleed"
            unit="mm"
            min={0}
            max={10}
            step={0.5}
            value={project.bleedMm}
            onChange={setBleed}
          />
        </Row>
        <NumberField
          label="Gap between cards"
          unit="mm"
          min={0}
          max={20}
          step={0.5}
          value={p.gapMm}
          onChange={(v) => set({ gapMm: Math.max(0, v) }, 'gap')}
        />
        {p.gapMm > 0 && (
          <p className="text-xs text-muted-foreground">
            Each card is cut on its own: neighbours no longer share a cut line. Fewer cards may fit
            on a sheet.
          </p>
        )}
        {project.bleedMm > 0 && (
          <div className="flex flex-col gap-1">
            <Label>Bleed fill</Label>
            <Tabs
              value={p.bleedFill}
              onValueChange={(v) => set({ bleedFill: v as PrintSettings['bleedFill'] })}
            >
              <TabsList className="w-full">
                <TabsTrigger value="mirror">Mirror edges</TabsTrigger>
                <TabsTrigger value="stretch">Stretch edges</TabsTrigger>
                <TabsTrigger value="off">As designed</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {p.bleedFill === 'off'
                ? 'The bleed shows only what is drawn past the cut line.'
                : 'The bleed takes its colours from the edge of each card, so a slightly off cut never shows white.'}
            </p>
          </div>
        )}
      </Section>
      <ColorSettings p={p} />
      <Section title="Draft (saves ink)">
        <Toggle label="Greyscale" checked={p.draftGrey} onChange={(v) => set({ draftGrey: v })} />
        <Toggle
          label="Leave out art"
          checked={p.draftNoArt}
          onChange={(v) => set({ draftNoArt: v })}
        />
        <p className="text-xs text-muted-foreground">
          For playtest copies. “Leave out art” skips pictures and art boxes; frames, text and shapes
          still print.
        </p>
      </Section>
      <Section title="Cutting">
        <Toggle
          label="Cut marks at the card edge"
          checked={p.cutMarks}
          onChange={(v) => set({ cutMarks: v })}
        />
        <Toggle
          label="Bleed marks (dotted)"
          checked={p.bleedMarks}
          onChange={(v) => set({ bleedMarks: v })}
        />
        {(p.cutMarks || p.bleedMarks) && (
          <Toggle
            label="Run marks to paper edge"
            checked={p.markToEdge}
            onChange={(v) => set({ markToEdge: v })}
          />
        )}
        {(p.cutMarks || p.bleedMarks) && (
          <Row>
            <NumberField
              label={p.markToEdge ? 'Room for marks' : 'Mark length'}
              unit="mm"
              min={1}
              max={15}
              step={0.5}
              value={p.markLengthMm}
              onChange={(v) => set({ markLengthMm: v }, 'mlen')}
            />
            <NumberField
              label="Gap from bleed"
              unit="mm"
              min={0}
              max={10}
              step={0.5}
              value={p.markOffsetMm}
              onChange={(v) => set({ markOffsetMm: v }, 'moff')}
            />
          </Row>
        )}
        <Toggle
          label="Guide lines across the sheet"
          checked={p.guideLines}
          onChange={(v) => set({ guideLines: v })}
        />
        <p className="text-xs text-muted-foreground">
          Marks sit outside the bleed, so they never print on a card. Solid marks show the card edge
          (where you cut); dotted marks show the bleed edge.
          {(p.cutMarks || p.bleedMarks) && p.markToEdge
            ? ' They run to the paper edge; your printer leaves out the part in its margin. “Room for marks” is the space kept free around the cards.'
            : ''}{' '}
          Guide lines run through every cut line (and, dotted, every bleed edge when bleed marks are
          on).
        </p>
      </Section>
      <Section title="Backs">
        <div className="flex flex-col gap-1">
          <Label>Sheets</Label>
          <Tabs
            value={p.sheets}
            onValueChange={(v) => set({ sheets: v as PrintSettings['sheets'] })}
          >
            <TabsList className="w-full">
              <TabsTrigger value="both">Fronts + backs</TabsTrigger>
              <TabsTrigger value="fronts">Fronts</TabsTrigger>
              <TabsTrigger value="backs">Backs</TabsTrigger>
            </TabsList>
          </Tabs>
          {p.sheets === 'backs' && (
            <p className="text-xs text-muted-foreground">
              Backs are laid out mirrored for your flip setting, so this sheet can also be fed back
              through the printer behind a printed fronts sheet.
            </p>
          )}
        </div>
        {p.sheets !== 'fronts' && (
          <>
            <div className="flex flex-col gap-1">
              <Label>Double-sided flip (match your printer)</Label>
              <Tabs value={p.flip} onValueChange={(v) => set({ flip: v as PrintSettings['flip'] })}>
                <TabsList className="w-full">
                  <TabsTrigger value="long">Long edge</TabsTrigger>
                  <TabsTrigger value="short">Short edge</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Row>
              <NumberField
                label="Back offset X"
                unit="mm"
                min={-10}
                max={10}
                step={0.1}
                value={p.backOffsetXMm}
                onChange={(v) => set({ backOffsetXMm: v }, 'bx')}
              />
              <NumberField
                label="Back offset Y"
                unit="mm"
                min={-10}
                max={10}
                step={0.1}
                value={p.backOffsetYMm}
                onChange={(v) => set({ backOffsetYMm: v }, 'by')}
              />
            </Row>
            <p className="text-xs text-muted-foreground">
              Print the alignment test first. If the backs land off, enter the difference here.
            </p>
          </>
        )}
      </Section>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}
