import { useEditor } from '@/core/editor/editorStore'
import { cn } from '@/lib/cn'
import { setEditMode } from '@/ui/panels/editMode'

/** Card mode fills in a card; template mode edits the layout shared by many cards. */
export function ModeSwitch({ className }: { className?: string }) {
  const mode = useEditor((s) => s.view.mode)
  const toTemplate = () => void setEditMode('template')
  const toCard = () => void setEditMode('card')
  return (
    <div
      role="radiogroup"
      aria-label="Editing mode"
      className={cn('inline-flex rounded-lg bg-muted p-0.5', className)}
    >
      {(
        [
          ['card', 'Card', toCard],
          ['template', 'Template', toTemplate],
        ] as const
      ).map(([m, label, fn]) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={fn}
          className={cn(
            'h-11 rounded-md px-3 text-xs font-medium text-muted-foreground md:h-7',
            mode === m && 'bg-panel text-foreground shadow-sm',
            mode === m && m === 'template' && 'text-accent',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
