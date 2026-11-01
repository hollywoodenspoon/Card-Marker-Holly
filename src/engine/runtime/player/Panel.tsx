import { cn } from '@/lib/cn'
import { X } from '@/ui/icons'

/** A screen over the scene in the player: a title, a close button and a scrolling body. */
export function Panel({
  title,
  onClose,
  closeLabel = 'Close',
  children,
  footer,
  wide,
  testId,
}: {
  title: React.ReactNode
  onClose?: () => void
  closeLabel?: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
  testId?: string
}) {
  return (
    <div className="pt-safe pb-safe absolute inset-0 z-10 grid place-items-center bg-black/60 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-label={typeof title === 'string' ? title : undefined}
        data-testid={testId}
        className={cn(
          'hs-pop flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-white/15 bg-neutral-900/95 text-white shadow-2xl',
          wide ? 'max-w-4xl' : 'max-w-lg',
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-2">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="grid size-11 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white md:size-9"
            >
              <X className="size-5" />
            </button>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 px-4 py-2">
            {footer}
          </footer>
        )}
      </section>
    </div>
  )
}

/** A plain button for the player's dark screens. */
export function PlayerButton({
  className,
  primary,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-40 md:min-h-9',
        primary
          ? 'bg-accent text-accent-foreground hover:bg-accent/90'
          : 'bg-white/10 text-white hover:bg-white/20',
        className,
      )}
      {...props}
    />
  )
}
