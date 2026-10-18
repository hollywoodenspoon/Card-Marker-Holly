import { Crop, ImageUp, RotateCcw } from 'lucide-react'
import { setView, useEditor } from '@/core/editor/editorStore'
import { findSurfaceElement } from '@/core/editor/selectors'
import { hasCardValue, resetFieldValue } from '@/templates/fieldCommands'
import { chooseImageFor } from '@/ui/actions/imageActions'
import { Button } from '@/ui/components/ui/button'
import { useImageValue } from '@/ui/panels/properties/useFieldValues'

/** Quick actions for a selected art box, floating over the canvas on every layout. */
export function SelectionActions() {
  const id = useEditor((s) => (s.view.selection.length === 1 ? s.view.selection[0] : null))
  const isField = useEditor((s) => (id ? findSurfaceElement(s, id)?.type === 'imageField' : false))
  const editingText = useEditor((s) => !!s.view.editingTextId)
  if (!id || !isField || editingText) return null
  return <Bar id={id} />
}

function Bar({ id }: { id: string }) {
  const value = useImageValue(id)
  const mode = useEditor((s) => s.view.mode)
  const cropping = useEditor((s) => s.view.cropId === id)
  const overridden = useEditor(() => hasCardValue(id))
  const has = !!value?.assetId
  return (
    <div
      className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-panel/95 p-1 shadow-md backdrop-blur md:bottom-16"
      onPointerDown={(e) => e.stopPropagation()}
    >
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
