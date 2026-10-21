import { Magnet, Maximize, Minus, Plus, Scan, SquareDashed } from '@/ui/icons'
import { useMemo } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { CardStage } from '@/core/render/CardStage'
import { setView, useEditor } from '@/core/editor/editorStore'
import {
  activeTemplate,
  currentCard,
  findSurfaceElement,
  isLayoutEditable,
} from '@/core/editor/selectors'
import { fitToScreen, useViewport, zoomIn, zoomOut } from '@/core/render/viewport'
import { cn } from '@/lib/cn'
import { cardContext } from '@/templates/cardContext'
import { resolveSide } from '@/templates/resolve'
import { IconButton } from '@/ui/components/ui/button'
import { useCoarsePointer, type LayoutKind } from '@/ui/shell/useLayout'
import { useIsDark } from '@/ui/theme/theme'
import { screenToMm } from '@/core/render/viewport'
import { currentImageValue, setImageFieldValue } from '@/templates/fieldCommands'
import { chooseIconFor, chooseImageFor, importAndPlace } from '@/ui/actions/imageActions'
import { CanvasHeader } from './CanvasHeader'
import { SelectionActions } from './SelectionActions'
import { TextEditOverlay } from './TextEditOverlay'
import { useRenderVersion } from './useRenderVersion'
import { FirstSteps } from '@/ui/onboarding/FirstSteps'

export function CanvasArea({ layout }: { layout: LayoutKind }) {
  const doc = useEditor((s) => s.doc)
  const view = useEditor((s) => s.view)
  const renderVersion = useRenderVersion()
  const dark = useIsDark()
  const coarse = useCoarsePointer()

  const state = useEditor.getState()
  const template = doc ? activeTemplate({ ...state, doc, view }) : undefined
  const card = doc ? currentCard({ ...state, doc, view }) : undefined
  const ctx = doc
    ? cardContext(doc.project, doc.cards, view.mode === 'template' ? undefined : card?.id)
    : undefined
  const nodes = useMemo(
    // Template mode shows the template's own defaults, not the current card's values.
    () =>
      resolveSide(
        template,
        view.mode === 'template' ? undefined : card,
        view.side,
        view.mode,
        doc?.stylePresets,
        ctx,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      template,
      card,
      view.side,
      view.mode,
      doc?.stylePresets,
      ctx?.number,
      ctx?.total,
      ctx?.keywords,
    ],
  )

  if (!doc) return null
  const size = template?.size ?? doc.project.defaultSize

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden bg-canvas"
      onDragOver={(e) => {
        if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        const files = [...e.dataTransfer.files]
        if (!files.length) return
        const r = e.currentTarget.getBoundingClientRect()
        const at = screenToMm(e.clientX - r.left, e.clientY - r.top)
        const intoField = dropTarget(at)
        void importAndPlace(files, intoField ? undefined : at, !intoField)
      }}
    >
      {template ? (
        <CardStage
          nodes={nodes}
          widthMm={size.widthMm}
          heightMm={size.heightMm}
          bleedMm={doc.project.bleedMm}
          safeMm={doc.project.safeMm}
          cornerRadiusMm={doc.project.cornerGuide?.enabled ? doc.project.cornerGuide.radiusMm : 0}
          guides={template.guides}
          assets={assetResolver}
          renderVersion={renderVersion}
          dark={dark}
          coarse={coarse}
          onTextEdit={(id) => setView({ editingTextId: id, selection: [id] })}
          onImageEdit={(id) => {
            const s = useEditor.getState()
            const el = findSurfaceElement(s, id)
            // An icon row without an icon asks for one; otherwise nothing to do.
            if (el?.type === 'iconRow') {
              if (!el.assetId && isLayoutEditable(s, id)) void chooseIconFor(id)
              return
            }
            // An empty art box opens the file picker; otherwise reposition/crop.
            if (
              findSurfaceElement(useEditor.getState(), id)?.type === 'imageField' &&
              !currentImageValue(id)?.assetId
            ) {
              setView({ selection: [id] })
              void chooseImageFor(id)
            } else setView({ cropId: id, selection: [id] })
          }}
          onImageFieldFrame={(id, patch) => setImageFieldValue(id, patch, 'frame:' + id)}
        />
      ) : (
        <div className="grid h-full place-items-center p-6 text-center text-sm text-white/90">
          {card
            ? 'This side has no template. Pick one in the Templates panel.'
            : 'No card selected.'}
        </div>
      )}
      <CanvasHeader phone={layout === 'phone'} />
      <FirstSteps phone={layout === 'phone'} />
      <TextEditOverlay phone={layout === 'phone'} />
      <SelectionActions />
      <ViewControls compact={layout === 'phone'} />
    </div>
  )
}

/**
 * Dropping onto an image field fills it: select the frame under the pointer
 * and return true so the image goes into it instead of floating free.
 */
function dropTarget(at: { x: number; y: number }): boolean {
  const s = useEditor.getState()
  const all = [
    ...(activeTemplate(s)?.elements ?? []),
    ...(s.view.mode === 'card' ? (currentCard(s)?.local[s.view.side] ?? []) : []),
  ]
  const hit = [...all]
    .reverse()
    .find(
      (e) =>
        e.type === 'imageField' &&
        at.x >= e.xMm &&
        at.x <= e.xMm + e.wMm &&
        at.y >= e.yMm &&
        at.y <= e.yMm + e.hMm,
    )
  if (hit) setView({ selection: [hit.id] })
  return !!hit
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
        {/* Not the eye: that means show / hide a layer. */}
        {showOverlay ? <Scan /> : <SquareDashed />}
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
