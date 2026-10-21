import { ChevronDown, Layers } from '@/ui/icons'
import { useEditor } from '@/core/editor/editorStore'
import { activeTemplate } from '@/core/editor/selectors'
import { cn } from '@/lib/cn'
import { useUi } from '@/ui/uiStore'
import { LayersPanel } from './LayersPanel'
import { PropertiesPanel } from './PropertiesPanel'

/** Right side (desktop pane, tablet drawer): collapsible Layers on top, Properties below. */
export function RightPane() {
  const open = useUi((s) => s.layersOpen)
  const setOpen = useUi((s) => s.setLayersOpen)
  const mode = useEditor((s) => s.view.mode)
  const template = useEditor(activeTemplate)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className={cn('flex min-h-0 flex-col border-b', open && 'max-h-[45%]')}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-11 shrink-0 items-center gap-2 px-4 text-left md:h-10"
        >
          <Layers className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Layers
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {template ? `· ${template.name}${mode === 'template' ? ' (template)' : ''}` : ''}
          </span>
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              !open && '-rotate-90',
            )}
          />
        </button>
        {open && <LayersPanel embedded />}
      </section>
      <div className="min-h-0 flex-1 overflow-auto">
        <PropertiesPanel />
      </div>
    </div>
  )
}
