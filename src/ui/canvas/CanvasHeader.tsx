import { ArrowLeft } from 'lucide-react'
import { setView, useEditor } from '@/core/editor/editorStore'
import { activeTemplate, currentCard } from '@/core/editor/selectors'
import type { Side } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { cardsUsingTemplate } from '@/templates/fields'
import { Button } from '@/ui/components/ui/button'
import { ModeSwitch } from '@/ui/toolbar/ModeSwitch'

/** Floating header over the canvas: front/back switch and what is being edited. */
export function CanvasHeader({ phone }: { phone: boolean }) {
  const mode = useEditor((s) => s.view.mode)
  const side = useEditor((s) => s.view.side)
  const template = useEditor(activeTemplate)
  const card = useEditor(currentCard)
  const uses = useEditor((s) =>
    s.doc && template ? cardsUsingTemplate(Object.values(s.doc.cards), template.id).length : 0,
  )

  return (
    <div className="pointer-events-none absolute inset-x-0 top-7 z-10 flex flex-col items-center gap-2 px-3">
      <div className="pointer-events-auto flex items-center gap-2">
        {phone && <ModeSwitch className="shadow-md" />}
        {mode === 'card' && <SideSwitch side={side} disabled={!card} />}
      </div>
      {mode === 'template' && template && (
        <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-accent/40 bg-panel/95 py-1 pr-1 pl-3 text-xs shadow-md backdrop-blur">
          {phone ? (
            <span className="truncate">
              Template <b>{template.name}</b> · {uses} card{uses === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="truncate">
              Editing template <b>{template.name}</b> ({template.side}) · {uses} card
              {uses === 1 ? '' : 's'}
            </span>
          )}
          <Button
            size="sm"
            className="h-9 rounded-full md:h-7"
            onClick={() =>
              setView({ mode: 'card', selection: [], editingTextId: null, cropId: null })
            }
          >
            <ArrowLeft /> {phone ? 'Done' : 'Back to card'}
          </Button>
        </div>
      )}
    </div>
  )
}

function SideSwitch({ side, disabled }: { side: Side; disabled: boolean }) {
  return (
    <div
      role="radiogroup"
      aria-label="Card side"
      className="inline-flex rounded-lg border bg-panel/95 p-0.5 shadow-md backdrop-blur"
    >
      {(['front', 'back'] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={side === s}
          disabled={disabled}
          onClick={() => setView({ side: s, selection: [], editingTextId: null, cropId: null })}
          className={cn(
            'h-10 rounded-md px-3 text-xs font-medium text-muted-foreground capitalize md:h-7',
            side === s && 'bg-accent text-accent-foreground',
          )}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
