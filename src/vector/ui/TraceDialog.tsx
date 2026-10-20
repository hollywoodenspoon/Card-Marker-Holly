import { ImageUp, Loader2, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IMAGE_ACCEPT } from '@/assets/imageAssets'
import { useEditor } from '@/core/editor/editorStore'
import { pickFiles } from '@/ui/actions/imageActions'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { pathData as toD } from '../geometry'
import { useVector, vcommit } from '../store'
import {
  cornerColor,
  DEFAULT_TRACE,
  tracedLayer,
  tracerOptions,
  type TraceSettings,
} from '../trace/trace'
import { loadPixels, traceImage } from '../trace/traceImage'

export function TraceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Trace image"
        description="Turn a picture into editable vector shapes, one per colour. Works best on logos, icons and flat art."
        className="max-w-2xl"
      >
        {open && <TraceForm onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

interface Source {
  name: string
  pixels: ImageData
}

function TraceForm({ onClose }: { onClose: () => void }) {
  const assets = useEditor((s) => s.library.assets)
  const rasters = useMemo(
    () =>
      Object.values(assets)
        .filter((a) => !a.isVector)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assets],
  )
  const [assetId, setAssetId] = useState(rasters[0]?.id ?? '')
  const [source, setSource] = useState<Source | null>(null)
  const [settings, setSettings] = useState<TraceSettings>(DEFAULT_TRACE)
  const [svg, setSvg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load the chosen asset.
  useEffect(() => {
    const a = assetId ? assets[assetId] : undefined
    if (!a) return
    let live = true
    void loadPixels(a.blob)
      .then((pixels) => live && setSource({ name: a.name, pixels }))
      .catch(() => live && setError('This picture could not be read.'))
    return () => {
      live = false
    }
  }, [assetId, assets])

  // Trace again a moment after a setting changes (live preview).
  useEffect(() => {
    if (!source) return
    let live = true
    const t = setTimeout(() => {
      setBusy(true)
      traceImage(source.pixels, tracerOptions(settings))
        .then((s) => live && setSvg(s))
        .catch((e) => live && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => live && setBusy(false))
    }, 300)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [source, settings])

  const background = source && settings.ignoreBackground ? cornerColor(source.pixels) : null
  const previewUrl = useMemo(() => {
    if (!svg || !source) return null
    // Show what will be added: without the background shapes.
    const layer = tracedLayer(
      svg,
      { width: source.pixels.width, height: source.pixels.height },
      'p',
      background,
    )
    const paths = layer.items
      .map((i) => `<path d="${toD(i.subpaths)}" fill="${i.style.fill}" fill-rule="evenodd"/>`)
      .join('')
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${source.pixels.width} ${source.pixels.height}">${paths}</svg>`
    return { url: `data:image/svg+xml;utf8,${encodeURIComponent(s)}`, count: layer.items.length }
  }, [svg, source, background])

  const pickFile = async () => {
    const [f] = await pickFiles(IMAGE_ACCEPT, false)
    if (!f) return
    try {
      setSource({ name: f.name.replace(/\.[^.]+$/, ''), pixels: await loadPixels(f) })
      setAssetId('')
    } catch {
      setError('This picture could not be read.')
    }
  }

  const add = () => {
    if (!svg || !source) return
    const { doc } = useVector.getState()
    const layer = tracedLayer(svg, doc, `Traced ${source.name}`, background)
    vcommit((d) => void d.layers.push(layer))
    useVector.setState({
      activeLayerId: layer.id,
      selection: layer.items.map((i) => i.id),
      anchors: [],
      tool: 'select',
    })
    onClose()
  }

  const set = (patch: Partial<TraceSettings>) => setSettings({ ...settings, ...patch })
  const slider = (
    label: string,
    key: 'colors' | 'detail' | 'smooth' | 'minArea',
    min: number,
    max: number,
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between">
        {label} <span className="tabular-nums text-muted-foreground">{settings[key]}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={settings[key]}
        onChange={(e) => set({ [key]: Number(e.target.value) })}
        aria-label={label}
        className="accent-accent"
      />
    </label>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor="tr-asset">Picture</Label>
          <NativeSelect id="tr-asset" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            <option value="" disabled>
              {source && !assetId
                ? source.name
                : rasters.length
                  ? 'Choose an image'
                  : 'No uploaded pictures'}
            </option>
            {rasters.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button variant="outline" onClick={() => void pickFile()}>
          <ImageUp /> From a file…
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <div
          className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-[length:16px_16px] bg-[linear-gradient(45deg,#ddd_25%,transparent_25%),linear-gradient(-45deg,#ddd_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ddd_75%),linear-gradient(-45deg,transparent_75%,#ddd_75%)] bg-white"
          data-testid="trace-preview"
        >
          {previewUrl ? (
            <img src={previewUrl.url} alt="Traced preview" className="max-h-full max-w-full" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {source ? 'Tracing…' : 'Pick a picture'}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {slider('Colours', 'colors', 2, 16)}
          {slider('Detail', 'detail', 1, 10)}
          {slider('Smoothing', 'smooth', 0, 5)}
          {slider('Remove specks', 'minArea', 0, 64)}
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
            <input
              type="checkbox"
              className="size-4 accent-accent"
              checked={settings.ignoreBackground}
              onChange={(e) => set({ ignoreBackground: e.target.checked })}
            />
            Ignore background
          </label>
          <p className="text-xs text-muted-foreground" data-testid="trace-summary">
            {busy ? 'Tracing…' : previewUrl ? `${previewUrl.count} shapes` : ''}
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Photos and painted art turn into many small shapes; fewer colours and more smoothing help.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={add} disabled={!previewUrl || busy || !previewUrl.count}>
          {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} Trace
        </Button>
      </div>
    </div>
  )
}
