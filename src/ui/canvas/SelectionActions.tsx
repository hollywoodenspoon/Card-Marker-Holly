import { Copy, Crop, ImageUp, ListChecks, Minus, Plus, RotateCcw, Trash2 } from '@/ui/icons'
import { setView, useEditor } from '@/core/editor/editorStore'
import { deleteSelection, duplicateSelection } from '@/core/editor/elementCommands'
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
import { deletedToast } from '@/ui/actions/undoToast'
import { useImageValue } from '@/ui/panels/properties/useFieldValues'
import { useCoarsePointer } from '@/ui/shell/useLayout'

const STACK =
  'absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-16'
const BAR =
  'flex max-w-[calc(100vw-1rem)] items-center gap-1 rounded-xl border bg-panel/95 p-1 shadow-md backdrop-blur'

/**
 * Quick actions floating over the canvas: for a selected art box or icon row,
 * and on touch screens (no Delete key, no Shift-click) select several,
 * duplicate and delete.
 */
export function SelectionActions() {
  const id = useEditor((s) => (s.view.selection.length === 1 ? s.view.selection[0] : null))
  const type = useEditor((s) => (id ? findSurfaceElement(s, id)?.type : undefined))
  const editingText = useEditor((s) => !!s.view.editingTextId)
  const count = useEditor((s) => s.view.selection.length)
  const multi = useEditor((s) => s.view.multiSelect)
  const touch = useCoarsePointer()
  if (editingText) return null
  const typeBar =
    id && type === 'imageField' ? (
      <Bar id={id} />
    ) : id && type === 'iconRow' ? (
      <CountBar id={id} />
    ) : null
  const editBar = touch && (count > 0 || multi) ? <EditBar /> : null
  if (!typeBar && !editBar) return null
  return (
    <div className={STACK} onPointerDown={(e) => e.stopPropagation()}>
      {editBar}
      {typeBar}
    </div>
  )
}

/** Select several, Duplicate and Delete, for fingers. */
function EditBar() {
  const count = useEditor((s) => s.view.selection.length)
  const multi = useEditor((s) => s.view.multiSelect)
  // Template parts can't be deleted or copied on a card, only in template mode.
  const editable = useEditor((s) => s.view.selection.filter((x) => isLayoutEditable(s, x)).length)
  const remove = () => {
    const before = useEditor.getState().doc
    deleteSelection()
    if (useEditor.getState().doc !== before) deletedToast(count === 1 ? 'Layer' : `${count} layers`)
  }
  return (
    <div className={BAR} data-testid="edit-bar">
      <Button
        size="sm"
        variant={multi ? 'default' : 'ghost'}
        aria-pressed={multi}
        onClick={() => setView({ multiSelect: !multi })}
      >
        <ListChecks /> {multi ? 'Done' : 'Select several'}
      </Button>
      {multi && (
        <span className="px-1 text-xs text-muted-foreground" aria-live="polite">
          {count} selected
        </span>
      )}
      {editable > 0 && (
        <>
          <IconButton label="Duplicate" size="icon-sm" variant="ghost" onClick={duplicateSelection}>
            <Copy />
          </IconButton>
          <IconButton label="Delete" size="icon-sm" variant="ghost" onClick={remove}>
            <Trash2 />
          </IconButton>
        </>
      )}
    </div>
  )
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
    <div className={BAR}>
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
    <div className={BAR}>
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
