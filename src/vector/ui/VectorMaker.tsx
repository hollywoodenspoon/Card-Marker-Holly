import {
  ArrowLeft,
  FolderOpen,
  Layers,
  Maximize,
  Redo2,
  Save,
  SlidersHorizontal,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { pickFiles } from '@/ui/actions/imageActions'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Sheet } from '@/ui/components/ui/sheet'
import { useLayout } from '@/ui/shell/useLayout'
import { useUi } from '@/ui/uiStore'
import {
  deleteSelection,
  duplicateSelection,
  removeLastPenPoint,
  transformSelection,
} from '../actions'
import { translateM } from '../geometry'
import { newDoc, parseDoc } from '../model'
import { endVGesture, loadVectorDoc, setTool, useVector, vredo, vundo } from '../store'
import { fromSvg } from '../svg'
import { PropsPanel } from './PropsPanel'
import { SaveDialog } from './SaveDialog'
import { ToolBar } from './ToolBar'
import { VectorCanvas } from './VectorCanvas'
import { VLayersPanel } from './VLayersPanel'
import { fitView, zoomTo } from './viewport'

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

/** Open the Vector Maker's document: a new one, or the asset being edited. */
async function openFor(assetId: string | null) {
  const asset = assetId ? useEditor.getState().library.assets[assetId] : undefined
  if (!asset) return loadVectorDoc(newDoc())
  const saved = parseDoc(asset.vectorDoc)
  if (saved) return loadVectorDoc(saved, asset.id)
  if (asset.isVector) {
    try {
      return loadVectorDoc(fromSvg(await asset.blob.text()), asset.id)
    } catch {
      /* not readable: start fresh */
    }
  }
  loadVectorDoc(newDoc())
}

/** Full-screen vector editor (pen, shapes, combining, layers), saving into assets. */
export default function VectorMaker() {
  const req = useUi((s) => s.vectorOpen)
  const layout = useLayout()
  const assetId = useVector((s) => s.assetId)
  const assetName = useEditor((s) => (assetId ? s.library.assets[assetId]?.name : undefined))
  const zoom = useVector((s) => s.view.zoom)
  const canUndo = useVector((s) => s.past.length > 0)
  const canRedo = useVector((s) => s.future.length > 0)
  const [saving, setSaving] = useState(false)
  const [sheet, setSheet] = useState<'props' | 'layers' | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void openFor(req?.assetId ?? null).then(() => {
      setReady(true)
      requestAnimationFrame(fitView)
    })
  }, [req?.assetId])

  const close = () => {
    if (
      useVector.getState().dirty &&
      !confirm('Close the Vector Maker? Changes that are not saved to assets will be lost.')
    )
      return
    useUi.getState().setVectorOpen(null)
  }

  const openSvg = async () => {
    const [f] = await pickFiles('.svg,image/svg+xml', false)
    if (!f) return
    try {
      loadVectorDoc(fromSvg(await f.text()))
      requestAnimationFrame(fitView)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      const run = (fn: () => void) => {
        e.preventDefault()
        fn()
      }
      if (mod && k === 'z' && !e.shiftKey) return run(vundo)
      if ((mod && k === 'z' && e.shiftKey) || (mod && k === 'y')) return run(vredo)
      if (mod && k === 'd') return run(duplicateSelection)
      if (mod && k === 's') return run(() => setSaving(true))
      if (mod && (k === '=' || k === '+'))
        return run(() => zoomTo(useVector.getState().view.zoom * 1.25))
      if (mod && k === '-') return run(() => zoomTo(useVector.getState().view.zoom / 1.25))
      if (mod && k === '0') return run(fitView)
      if (mod && k === 'a')
        return run(() =>
          useVector.setState((s) => ({
            selection: s.doc.layers
              .filter((l) => l.visible && !l.locked)
              .flatMap((l) => l.items.filter((i) => !i.hidden && !i.locked).map((i) => i.id)),
            anchors: [],
          })),
        )
      if (mod) return
      if (k === 'delete' || k === 'backspace')
        // While drawing, take back the last point (Illustrator); otherwise delete.
        return run(useVector.getState().penPathId ? removeLastPenPoint : deleteSelection)
      const nudge = e.shiftKey ? 10 : 1
      const arrows: Record<string, [number, number]> = {
        arrowleft: [-nudge, 0],
        arrowright: [nudge, 0],
        arrowup: [0, -nudge],
        arrowdown: [0, nudge],
      }
      if (arrows[k]) {
        run(() => transformSelection(translateM(...arrows[k]), 'nudge'))
        endVGesture()
        return
      }
      if (e.shiftKey && k === 'c') return run(() => setTool('convert'))
      const keys: Record<string, Parameters<typeof setTool>[0]> = {
        v: 'select',
        a: 'direct',
        p: 'pen',
        '+': 'addAnchor',
        '=': 'addAnchor',
        '-': 'deleteAnchor',
        u: 'shape',
        h: 'hand',
      }
      if (keys[k]) return run(() => setTool(keys[k]))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const phone = layout === 'phone'
  const side = (
    <>
      <PropsPanel />
      <div className="border-t">
        <VLayersPanel />
      </div>
    </>
  )

  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-label="Vector Maker"
    >
      <header className="flex shrink-0 items-center gap-1 border-b bg-panel px-2 py-1.5">
        <IconButton label="Back to editor" onClick={close}>
          <ArrowLeft />
        </IconButton>
        <div className="mr-1 min-w-0 truncate text-sm font-semibold">
          Vector Maker
          {assetName ? (
            <span className="font-normal text-muted-foreground"> · {assetName}</span>
          ) : null}
        </div>
        <IconButton label="Undo" disabled={!canUndo} onClick={vundo}>
          <Undo2 />
        </IconButton>
        <IconButton label="Redo" disabled={!canRedo} onClick={vredo}>
          <Redo2 />
        </IconButton>
        <div className="flex-1" />
        {!phone && (
          <>
            <IconButton label="Zoom out" onClick={() => zoomTo(zoom / 1.25)}>
              <ZoomOut />
            </IconButton>
            <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
            <IconButton label="Zoom in" onClick={() => zoomTo(zoom * 1.25)}>
              <ZoomIn />
            </IconButton>
            <IconButton label="Fit artboard" onClick={fitView}>
              <Maximize />
            </IconButton>
            <IconButton label="Open SVG file" onClick={() => void openSvg()}>
              <FolderOpen />
            </IconButton>
          </>
        )}
        {layout !== 'desktop' && (
          <>
            <IconButton label="Properties" onClick={() => setSheet('props')}>
              <SlidersHorizontal />
            </IconButton>
            <IconButton label="Layers" onClick={() => setSheet('layers')}>
              <Layers />
            </IconButton>
          </>
        )}
        <Button onClick={() => setSaving(true)}>
          <Save /> Save
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        {!phone && <ToolBar />}
        {ready && <VectorCanvas />}
        {layout === 'desktop' && (
          <aside className="w-[300px] shrink-0 overflow-y-auto border-l bg-panel">{side}</aside>
        )}
      </div>
      {phone && <ToolBar horizontal />}
      {layout !== 'desktop' && (
        <>
          <Sheet
            open={sheet === 'props'}
            onOpenChange={(o) => !o && setSheet(null)}
            side={phone ? 'bottom' : 'right'}
            title="Properties"
            tall
            modal={false}
          >
            <div className="min-h-0 overflow-y-auto">
              <PropsPanel />
              {phone && (
                <div className="p-3">
                  <Button variant="outline" className="w-full" onClick={() => void openSvg()}>
                    <FolderOpen /> Open SVG file
                  </Button>
                </div>
              )}
            </div>
          </Sheet>
          <Sheet
            open={sheet === 'layers'}
            onOpenChange={(o) => !o && setSheet(null)}
            side={phone ? 'bottom' : 'right'}
            title="Layers"
            modal={false}
          >
            <div className="min-h-0 overflow-y-auto">
              <VLayersPanel />
            </div>
          </Sheet>
        </>
      )}
      <SaveDialog open={saving} onClose={() => setSaving(false)} />
    </div>
  )
}
