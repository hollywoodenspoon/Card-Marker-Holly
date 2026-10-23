import { FileUp, Plus, Trash2 } from '@/ui/icons'
import { useRef, useState } from 'react'
import { setPrintSettings } from '@/core/editor/projectCommands'
import type { PrintSettings } from '@/core/model/types'
import { formatCmyk, hexToRgb, parseCmyk, rgbToHex, type Cmyk } from '@/print/color/cmyk'
import { BUILTIN_PROFILE } from '@/print/color/profiles'
import type { FullPrintSettings } from '@/print/settings'
import { toast } from '@/ui/components/feedback'
import { Section } from '@/ui/components/fields'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { clearCustomProfile, setCustomProfile, useCustomProfile } from './cmykProfile'

const set = (patch: Partial<PrintSettings>, key?: string) =>
  setPrintSettings(patch, key && 'print:' + key)

type Swatches = NonNullable<PrintSettings['cmykSwatches']>
const toPercent = (c: Cmyk) => c.map((v) => Math.round(v * 1000) / 10) as Swatches[string]

/** Print → Colour: RGB or CMYK, the printer profile and exact CMYK colours. */
export function ColorSettings({ p }: { p: FullPrintSettings }) {
  const custom = useCustomProfile((s) => s.custom)
  const file = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const cmyk = p.colorMode === 'cmyk'

  const load = async (f: File) => {
    setLoading(true)
    try {
      const c = await setCustomProfile(f)
      set({ cmykProfile: 'custom' })
      toast(`Loaded “${c.description}”.`)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Colour">
      <Tabs value={p.colorMode} onValueChange={(v) => set({ colorMode: v as 'rgb' | 'cmyk' })}>
        <TabsList className="w-full">
          <TabsTrigger value="rgb">RGB · home printer</TabsTrigger>
          <TabsTrigger value="cmyk" data-testid="print-cmyk">
            CMYK · print shop
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        {cmyk
          ? 'Every colour, picture and SVG is converted to printing inks with the profile below, and the profile goes into the PDF. The preview shows how the colours will print.'
          : 'Home and office printers expect RGB and convert it themselves. Choose CMYK when a print shop asks for it.'}
      </p>
      {cmyk && (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="print-profile">Printer profile</Label>
            <NativeSelect
              id="print-profile"
              value={p.cmykProfile}
              onChange={(e) => set({ cmykProfile: e.target.value as 'builtin' | 'custom' })}
              data-testid="print-profile"
            >
              <option value="builtin">{BUILTIN_PROFILE.name}</option>
              <option value="custom">
                {custom ? `${custom.description} (print shop)` : 'Print shop profile…'}
              </option>
            </NativeSelect>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => file.current?.click()}
                disabled={loading}
              >
                <FileUp /> {custom ? 'Replace profile…' : 'Load ICC profile…'}
              </Button>
              {custom && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void clearCustomProfile()
                    set({ cmykProfile: 'builtin' })
                  }}
                >
                  <Trash2 /> Remove
                </Button>
              )}
            </div>
            <input
              ref={file}
              type="file"
              accept=".icc,.icm,application/vnd.iccprofile"
              hidden
              aria-label="ICC profile file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void load(f)
                e.target.value = ''
              }}
            />
            <p className="text-xs text-muted-foreground">
              Ask the print shop which profile they print with, and load their .icc file if they
              send one. FOGRA39 suits most shops outside the US. A loaded profile stays on this
              device.
              {p.cmykProfile === 'custom' && custom === null
                ? ' No print shop profile is loaded here yet, so FOGRA39 is used.'
                : ''}
            </p>
          </div>
          <ExactColors swatches={p.cmykSwatches} />
        </>
      )}
    </Section>
  )
}

/** Exact CMYK for chosen colours (brand colours, or ones a print shop matched). */
function ExactColors({ swatches }: { swatches: Swatches }) {
  const [pick, setPick] = useState('#c0392b')
  const entries = Object.entries(swatches)
  const update = (next: Swatches) => set({ cmykSwatches: next })
  return (
    <div className="flex flex-col gap-1.5" data-testid="print-swatches">
      <Label>Exact CMYK colours</Label>
      {entries.map(([hex, c]) => (
        <SwatchRow
          key={hex}
          hex={hex}
          value={c}
          onChange={(v) => update({ ...swatches, [hex]: v })}
          onRemove={() => {
            const next = { ...swatches }
            delete next[hex]
            update(next)
          }}
        />
      ))}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          aria-label="Colour to set exactly"
          className="h-9 w-11 shrink-0 cursor-pointer rounded border bg-transparent"
        />
        <Input
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          aria-label="Colour (hex)"
          className="h-9 font-mono text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const hex = rgbToHex(hexToRgb(pick))
            if (!swatches[hex]) update({ ...swatches, [hex]: [0, 0, 0, 0] })
          }}
        >
          <Plus /> Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        A colour listed here prints with exactly these inks (cyan / magenta / yellow / black, in
        percent), for brand colours or ones the shop matched. Everything else is converted with the
        profile. Large black areas print rich black (60/40/40/100) and black text plain 0/0/0/100,
        unless black is listed here.
      </p>
    </div>
  )
}

function SwatchRow({
  hex,
  value,
  onChange,
  onRemove,
}: {
  hex: string
  value: Swatches[string]
  onChange: (v: Swatches[string]) => void
  onRemove: () => void
}) {
  const shown = formatCmyk(value.map((v) => v / 100) as Cmyk)
  const [text, setText] = useState(shown)
  const parsed = parseCmyk(text)
  return (
    <div className="flex items-center gap-2">
      <span className="size-7 shrink-0 rounded border" style={{ background: hex }} aria-hidden />
      <span className="w-16 shrink-0 font-mono text-xs">{hex}</span>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => (parsed ? onChange(toPercent(parsed)) : setText(shown))}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label={`CMYK for ${hex}`}
        aria-invalid={!parsed}
        placeholder="0/40/100/0"
        className="h-9 font-mono text-xs"
      />
      <IconButton label={`Remove ${hex}`} onClick={onRemove}>
        <Trash2 />
      </IconButton>
    </div>
  )
}
