import { Eye, EyeOff, Magnet, Maximize, Minus, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { CardStage } from '@/core/render/CardStage'
import { setView, useEditor } from '@/core/editor/editorStore'
import { activeTemplate, currentCard } from '@/core/editor/selectors'
import { fitToScreen, useViewport, zoomIn, zoomOut } from '@/core/render/viewport'
import { cn } from '@/lib/cn'
import { resolveSide } from '@/templates/resolve'
import { IconButton } from '@/ui/components/ui/button'
import { useCoarsePointer, type LayoutKind } from '@/ui/shell/useLayout'
import { useIsDark } from '@/ui/theme/theme'
import { useRenderVersion } from './useRenderVersion'

export function CanvasArea({ layout }: { layout: LayoutKind }) {
  const doc = useEditor((s) => s.doc)
  const view = useEditor((s) => s.view)
  const renderVersion = useRenderVersion()
  const dark = useIsDark()
  const coarse = useCoarsePointer()

  const state = useEditor.getState()
  const template = doc ? activeTemplate({ ...state, doc, view }) : undefined
  const card = doc ? currentCard({ ...state, doc, view }) : undefined
  const nodes = useMemo(
    () => resolveSide(template, card, view.side, view.mode),
    [template, card, view.side, view.mode],
  )

  if (!doc) return null
  const size = template?.size ?? doc.project.defaultSize

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-canvas">
      {template ? (
        <CardStage
          nodes={nodes}
          widthMm={size.widthMm}
          heightMm={size.heightMm}
          bleedMm={doc.project.bleedMm}
          safeMm={doc.project.safeMm}
          guides={template.guides}
          assets={assetResolver}
          renderVersion={renderVersion}
          dark={dark}
          coarse={coarse}
          onTextEdit={(id) => setView({ editingTextId: id, selection: [id] })}
          onImageEdit={(id) => setView({ cropId: id, selection: [id] })}
        />
      ) : (
        <div className="grid h-full place-items-center p-6 text-center text-sm text-white/90">
          {card
            ? 'This side has no template. Pick one in the Templates panel.'
            : 'No card selected.'}
        </div>
      )}
      <ViewControls compact={layout === 'phone'} />
    </div>
  )
}

function ViewControls({ compact }: { compact: boolean }) {
  const zoom = useViewport((s) => s.zoom)
  const showOverlay = useEditor((s) => s.view.showOverlay)
  const snapping = useEditor((s) => s.view.snapping)
  return (
    <div
      className={cn(
        'absolute right-3 bottom-3 flex items-center gap-0.5 rounded-xl border bg-panel/95 p-1 shadow-md backdrop-blur',
      )}
    >
      <IconButton
        label={showOverlay ? 'Hide bleed and safe area' : 'Show bleed and safe area'}
        size="icon-sm"
        active={showOverlay}
        onClick={() => setView({ showOverlay: !showOverlay })}
      >
        {showOverlay ? <Eye /> : <EyeOff />}
      </IconButton>
      <IconButton
        label={snapping ? 'Turn snapping off' : 'Turn snapping on'}
        size="icon-sm"
        active={snapping}
        onClick={() => setView({ snapping: !snapping })}
      >
        <Magnet />
      </IconButton>
      <span className="mx-0.5 h-5 w-px bg-border" />
      {!compact && (
        <IconButton label="Zoom out" size="icon-sm" onClick={zoomOut}>
          <Minus />
        </IconButton>
      )}
      <button
        type="button"
        onClick={() => fitToScreen()}
        className="h-11 min-w-12 rounded-md px-1 text-xs font-medium tabular-nums hover:bg-muted md:h-8"
        title="Fit to screen"
      >
        {Math.round(zoom * 100)}%
      </button>
      {!compact && (
        <IconButton label="Zoom in" size="icon-sm" onClick={zoomIn}>
          <Plus />
        </IconButton>
      )}
      <IconButton label="Fit to screen" size="icon-sm" onClick={() => fitToScreen()}>
        <Maximize />
      </IconButton>
    </div>
  )
}
