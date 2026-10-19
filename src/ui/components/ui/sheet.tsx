import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/cn'

/** Drag distance (px) past which a bottom sheet closes on release. */
const CLOSE_PX = 80

/** Slide-out drawer (tablet) or bottom sheet (phone), built on Radix Dialog. */
export function Sheet({
  open,
  onOpenChange,
  side,
  title,
  children,
  className,
  modal = true,
  tall,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: 'left' | 'right' | 'bottom'
  title: string
  children: React.ReactNode
  className?: string
  modal?: boolean
  /** Bottom sheet: use more of the screen (e.g. properties). */
  tall?: boolean
}) {
  // Swipe the header of a bottom sheet down to close it.
  const [dragY, setDragY] = useState(0)
  const start = useRef<number | null>(null)
  const swipe =
    side === 'bottom'
      ? {
          onPointerDown: (e: React.PointerEvent) => {
            if ((e.target as HTMLElement).closest('button')) return
            start.current = e.clientY
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          },
          onPointerMove: (e: React.PointerEvent) => {
            if (start.current !== null) setDragY(Math.max(0, e.clientY - start.current))
          },
          onPointerUp: () => {
            if (start.current !== null && dragY > CLOSE_PX) onOpenChange(false)
            start.current = null
            setDragY(0)
          },
          onPointerCancel: () => {
            start.current = null
            setDragY(0)
          },
          style: { touchAction: 'none' as const },
        }
      : {}

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogPrimitive.Portal>
        {modal && <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30" />}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={modal ? undefined : (e) => e.preventDefault()}
          style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
          className={cn(
            'fixed z-40 flex flex-col bg-panel shadow-2xl outline-none',
            side === 'left' && 'pl-safe inset-y-0 left-0 w-[320px] max-w-[85vw] border-r',
            side === 'right' && 'pr-safe inset-y-0 right-0 w-[320px] max-w-[85vw] border-l',
            side === 'bottom' &&
              cn(
                'pb-safe inset-x-0 bottom-0 rounded-t-2xl border-t',
                tall ? 'max-h-[85dvh]' : 'max-h-[70dvh]',
              ),
            className,
          )}
        >
          <div
            className="relative flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3"
            {...swipe}
          >
            {side === 'bottom' && (
              <span
                aria-hidden
                className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-input"
              />
            )}
            <DialogPrimitive.Title className="text-sm font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
