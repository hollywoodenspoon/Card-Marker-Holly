import { Check, X } from '@/ui/icons'
import { useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/components/ui/button'
import { firstRunDone, printWasOpened, setFirstRunDone } from './firstRun'

/**
 * A small checklist on the canvas for a new project, so a first card takes a
 * minute: name it, add art, print. Ticks itself; dismissible; once per device.
 */
export function FirstSteps({ phone }: { phone?: boolean }) {
  const [hidden, setHidden] = useState(firstRunDone)
  const named = useEditor((s) =>
    Object.values(s.doc?.cards ?? {}).some((c) =>
      Object.values(c.fields).some((v) => v.kind === 'text'),
    ),
  )
  const art = useEditor((s) =>
    Object.values(s.doc?.cards ?? {}).some((c) =>
      Object.values(c.fields).some((v) => v.kind === 'image'),
    ),
  )
  const printed = useEditor(() => printWasOpened())
  const few = useEditor((s) => Object.keys(s.doc?.cards ?? {}).length <= 3)
  if (hidden || !few) return null
  const steps = [
    { done: named, text: 'Click “Card name” on the card and type a name' },
    {
      done: art,
      text: phone
        ? 'Double-tap the grey art box to add a picture'
        : 'Double-click the grey art box to add a picture',
    },
    { done: printed, text: 'Press Print to get a PDF with cut marks' },
  ]
  const close = () => {
    setFirstRunDone()
    setHidden(true)
  }
  return (
    <div
      className={cn(
        'absolute z-10 w-72 rounded-xl border bg-panel/95 p-3 text-foreground shadow-md backdrop-blur',
        // Bottom left, clear of the card's name at the top and the view controls (bottom right).
        phone ? 'right-2 bottom-16 left-2 w-auto' : 'bottom-3 left-3',
      )}
      role="region"
      aria-label="First steps"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold">Make your first card</span>
        <IconButton label="Hide first steps" size="icon-sm" onClick={close}>
          <X />
        </IconButton>
      </div>
      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold',
                s.done ? 'border-accent bg-accent text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              {s.done ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={cn(s.done && 'text-muted-foreground line-through')}>{s.text}</span>
          </li>
        ))}
      </ol>
      {steps.every((s) => s.done) && (
        <p className="mt-2 text-xs text-accent">All done! Close this whenever you like.</p>
      )}
    </div>
  )
}
