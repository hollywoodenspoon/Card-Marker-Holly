import { Download, Loader2, Save } from 'lucide-react'
import { useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { addAssetFolder } from '@/ui/actions/assetFolders'
import { downloadBlob } from '@/ui/actions/download'
import { saveVectorAsset } from '@/ui/actions/vectorAssets'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { ColorField } from '@/ui/components/fields'
import { rasterize, safeName, toPdf, type RasterFormat } from '../exportFiles'
import { useVector } from '../store'
import { toSvg } from '../svg'
import { askText } from '@/ui/components/feedback'

type Format = 'svg' | RasterFormat
const NO_FOLDERS: string[] = []

export function SaveDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Save"
        description="Put it in this project's assets, or download it as a file."
      >
        {open && <SaveForm onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function SaveForm({ onClose }: { onClose: () => void }) {
  const doc = useVector((s) => s.doc)
  const assetId = useVector((s) => s.assetId)
  const assets = useEditor((s) => s.library.assets)
  const folders = useEditor((s) => s.doc?.project.assetFolders) ?? NO_FOLDERS
  const editing = assetId ? assets[assetId] : undefined
  const [tab, setTab] = useState<'assets' | 'download'>('assets')
  const [name, setName] = useState(editing?.name ?? 'Vector')
  const [format, setFormat] = useState<Format>(
    editing && !editing.isVector ? (editing.mime === 'image/jpeg' ? 'jpeg' : 'png') : 'svg',
  )
  const [scale, setScale] = useState(1)
  const [bg, setBg] = useState('#ffffff')
  const [folder, setFolder] = useState(editing?.folder ?? '')
  const [replace, setReplace] = useState(!!editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const file = async (f: Format): Promise<File> => {
    const base = safeName(name)
    if (f === 'svg') return new File([toSvg(doc)], `${base}.svg`, { type: 'image/svg+xml' })
    const blob = await rasterize(doc, f, scale, bg)
    return new File([blob], `${base}.${f === 'png' ? 'png' : 'jpg'}`, { type: blob.type })
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      let target = folder
      if (folder === '__new') {
        const n = await askText({
          title: 'New folder',
          label: 'Folder name',
          initial: 'Vectors',
          okLabel: 'Create',
        })
        if (!n) return
        target = addAssetFolder(n)
      }
      const asset = await saveVectorAsset({
        file: await file(format),
        vectorDoc: JSON.stringify(doc),
        folder: target || undefined,
        replaceId: replace ? assetId : null,
      })
      // The asset is named after the file (a replaced one keeps its name).
      if (asset) useVector.setState({ assetId: asset.id, dirty: false })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const download = async (f: Format | 'pdf') => {
    setBusy(true)
    setError(null)
    try {
      if (f === 'pdf') downloadBlob(await toPdf(doc), `${safeName(name)}.pdf`)
      else {
        const fl = await file(f)
        downloadBlob(fl, fl.name)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const raster = (show: boolean) =>
    show && (
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="vs-scale">Size</Label>
          <NativeSelect
            id="vs-scale"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          >
            {[1, 2, 4].map((k) => (
              <option key={k} value={k}>
                {k}× ({doc.width * k} × {doc.height * k} px)
              </option>
            ))}
          </NativeSelect>
        </div>
        <ColorField label="JPEG background" value={bg} onChange={(v) => setBg(v ?? '#ffffff')} />
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="assets">Save to assets</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-col gap-1">
        <Label htmlFor="vs-name">Name</Label>
        <Input
          id="vs-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={replace && tab === 'assets'}
        />
      </div>
      {tab === 'assets' ? (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="vs-format">Format</Label>
            <NativeSelect
              id="vs-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
            >
              <option value="svg">SVG (vector: sharp at any size, stays vector in the PDF)</option>
              <option value="png">PNG (transparent background)</option>
              <option value="jpeg">JPEG</option>
            </NativeSelect>
          </div>
          {raster(format !== 'svg')}
          {editing && (
            <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />
              Replace “{editing.name}” (every card using it updates)
            </label>
          )}
          {!replace && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="vs-folder">Folder</Label>
              <NativeSelect
                id="vs-folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
                <option value="__new">New folder…</option>
              </NativeSelect>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            The layers are kept with the asset: Assets → ⋯ → Edit in Vector Maker opens it again.
          </p>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Save />} Save to assets
            </Button>
          </div>
        </>
      ) : (
        <>
          {raster(true)}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(['svg', 'pdf', 'png', 'jpeg'] as const).map((f) => (
              <Button key={f} variant="outline" disabled={busy} onClick={() => void download(f)}>
                <Download /> {f.toUpperCase()}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            SVG and PDF stay vector and open in Illustrator, Inkscape and Affinity.
          </p>
        </>
      )}
    </div>
  )
}
