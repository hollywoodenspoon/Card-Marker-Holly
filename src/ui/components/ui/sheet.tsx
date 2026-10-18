import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Slide-out drawer (tablet) or bottom sheet (phone), built on Radix Dialog. */
export function Sheet({
  open,
  onOpenChange,
  side,
  title,
  children,
  className,
  modal = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: 'left' | 'right' | 'bottom'
  title: string
  children: React.ReactNode
  className?: string
  modal?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogPrimitive.Portal>
        {modal && <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30" />}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={modal ? undefined : (e) => e.preventDefault()}
          className={cn(
            'fixed z-40 flex flex-col bg-panel shadow-2xl outline-none',
            side === 'left' && 'pl-safe inset-y-0 left-0 w-[320px] max-w-[85vw] border-r',
            side === 'right' && 'pr-safe inset-y-0 right-0 w-[320px] max-w-[85vw] border-l',
            side === 'bottom' &&
              'pb-safe inset-x-0 bottom-0 max-h-[70dvh] rounded-t-2xl border-t',
            className,
          )}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
            {side === 'bottom' && (
              <span className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-input" />
            )}
            <DialogPrimitive.Title className="text-sm font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
