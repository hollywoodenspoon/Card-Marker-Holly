import { Crop, ImageUp, Minus, Plus, RotateCcw } from 'lucide-react'
import { setView, useEditor } from '@/core/editor/editorStore'
import { findSurfaceElement, isLayoutEditable } from '@/core/editor/selectors'
import {
  currentCount,
  currentGrey,
  hasCardValue,
  resetFieldValue,
  setCount,
  setGrey,
} from '@/templates/fieldCommands'
import { chooseIconFor, chooseImageFor } from '@/ui/actions/imageActions'
import { Button, IconButton } from '@/ui/components/ui/button'
import { useImageValue } from '@/ui/panels/properties/useFieldValues'

const BAR =
  'absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-panel/95 p-1 shadow-md backdrop-blur md:bottom-16'

/** Quick actions for a selected art box or icon row, floating over the canvas on every layout. */
export function SelectionActions() {
  const id = useEditor((s) => (s.view.selection.length === 1 ? s.view.selection[0] : null))
  const type = useEditor((s) => (id ? findSurfaceElement(s, id)?.type : undefined))
  const editingText = useEditor((s) => !!s.view.editingTextId)
  if (!id || editingText) return null
  if (type === 'imageField') return <Bar id={id} />
  if (type === 'iconRow') return <CountBar id={id} />
  return null
}

/** − count + for icon rows, so stats are quick to set on each card. */
function CountBar({ id }: { id: string }) {
  const count = useEditor(() => currentCount(id) ?? 0)
  const grey = useEditor(() => currentGrey(id) ?? 0)
  const name = useEditor((s) => findSurfaceElement(s, id)?.name ?? '')
  const noIcon = useEditor((s) => {
    const el = findSurfaceElement(s, id)
    return el?.type === 'iconRow' && !el.assetId
  })
  const canSetIcon = useEditor((s) => isLayoutEditable(s, id))
  const overridden = useEditor(() => hasCardValue(id))
  return (
    <div className={BAR} onPointerDown={(e) => e.stopPropagation()}>
      {noIcon && canSetIcon && (
        <Button size="sm" onClick={() => void chooseIconFor(id)}>
          <ImageUp /> Choose icon
        </Button>
      )}
      <span className="hidden max-w-28 truncate px-2 text-xs text-muted-foreground sm:inline">
        {name}
      </span>
      <IconButton
        label="One less"
        size="icon-sm"
        variant="outline"
        disabled={count <= 0}
        onClick={() => setCount(id, count - 1)}
      >
        <Minus />
      </IconButton>
      <span
        className="w-8 text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
        aria-label={`${name} count`}
      >
        {count}
      </span>
      <IconButton
        label="One more"
        size="icon-sm"
        variant="outline"
        onClick={() => setCount(id, count + 1)}
      >
        <Plus />
      </IconButton>
      <span className="mx-1 h-6 w-px bg-border" aria-hidden />
      <span
        className="px-1 text-xs text-muted-foreground"
        title="Greyed-out icons after the coloured ones"
      >
        Grey
      </span>
      <IconButton
        label="One less grey"
        size="icon-sm"
        variant="outline"
        disabled={grey <= 0}
        onClick={() => setGrey(id, grey - 1)}
      >
        <Minus />
      </IconButton>
      <span
        className="w-8 text-center text-sm font-semibold text-muted-foreground tabular-nums"
        aria-live="polite"
        aria-label={`${name} grey count`}
      >
        {grey}
      </span>
      <IconButton
        label="One more grey"
        size="icon-sm"
        variant="outline"
        onClick={() => setGrey(id, grey + 1)}
      >
        <Plus />
      </IconButton>
      {overridden && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => resetFieldValue(id)}
          title="Use the template's default counts"
          aria-label="Use the template's default counts"
        >
          <RotateCcw /> <span className="hidden sm:inline">Default</span>
        </Button>
      )}
    </div>
  )
}

function Bar({ id }: { id: string }) {
  const value = useImageValue(id)
  const mode = useEditor((s) => s.view.mode)
  const cropping = useEditor((s) => s.view.cropId === id)
  const overridden = useEditor(() => hasCardValue(id))
  const has = !!value?.assetId
  return (
    <div className={BAR} onPointerDown={(e) => e.stopPropagation()}>
      <Button size="sm" onClick={() => void chooseImageFor(id)}>
        <ImageUp /> {has ? 'Replace image' : 'Choose image'}
      </Button>
      {has && mode === 'card' && (
        <Button
          size="sm"
          variant={cropping ? 'default' : 'ghost'}
          onClick={() => setView({ cropId: cropping ? null : id })}
        >
          <Crop /> {cropping ? 'Done' : 'Reposition'}
        </Button>
      )}
      {overridden && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => resetFieldValue(id)}
          title="Use the template's default art"
        >
          <RotateCcw /> Default
        </Button>
      )}
    </div>
  )
}
