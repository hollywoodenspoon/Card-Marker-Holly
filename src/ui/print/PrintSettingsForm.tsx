import { useEditor } from '@/core/editor/editorStore'
import { setBleed, setPrintSettings } from '@/core/editor/projectCommands'
import type { PrintSettings } from '@/core/model/types'
import { capacity } from '@/print/layout'
import { PAPERS } from '@/print/paper'
import { normalizePrint } from '@/print/settings'
import { Label } from '@/ui/components/ui/input'
import { Switch } from '@/ui/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { NumberField, Row, Section } from '@/ui/components/fields'

const set = (patch: Partial<PrintSettings>, key?: string) =>
  setPrintSettings(patch, key && 'print:' + key)

export function PrintSettingsForm() {
  const project = useEditor((s) => s.doc!.project)
  const p = normalizePrint(project.print)
  const input = {
    paper: PAPERS[p.paper],
    card: { w: project.defaultSize.widthMm, h: project.defaultSize.heightMm },
    bleedMm: project.bleedMm,
    marginMm: p.marginMm,
    orientation: p.orientation,
    cutMarks: p.cutMarks,
    markLengthMm: p.markLengthMm,
    markOffsetMm: p.markOffsetMm,
  }
  const por = capacity(input, 'portrait').perSheet
  const lan = capacity(input, 'landscape').perSheet
  return (
    <div>
      <Section title="Sheet">
        <p className="text-sm">
          A4 · {project.defaultSize.widthMm} × {project.defaultSize.heightMm} mm cards
        </p>
        <div className="flex flex-col gap-1">
          <Label>Orientation</Label>
          <Tabs
            value={p.orientation}
            onValueChange={(v) => set({ orientation: v as PrintSettings['orientation'] })}
          >
            <TabsList className="w-full">
              <TabsTrigger value="auto">Best fit</TabsTrigger>
              <TabsTrigger value="portrait">Portrait · {por}</TabsTrigger>
              <TabsTrigger value="landscape">Landscape · {lan}</TabsTrigger>
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
      <Section title="Cutting">
        <Toggle label="Cut marks" checked={p.cutMarks} onChange={(v) => set({ cutMarks: v })} />
        {p.cutMarks && (
          <Row>
            <NumberField
              label="Mark length"
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
          Cut marks sit outside the bleed, so they never print on a card. Guide lines run through
          every cut line.
        </p>
      </Section>
      <Section title="Backs">
        <Toggle
          label="Print backs"
          checked={p.includeBacks}
          onChange={(v) => set({ includeBacks: v })}
        />
        {p.includeBacks && (
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
