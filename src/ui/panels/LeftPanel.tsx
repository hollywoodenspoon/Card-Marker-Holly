import { cn } from '@/lib/cn'
import { LEFT_PANELS, type PanelId } from './panelIds'
import { PanelBody } from './PanelBody'

/** Vertical icon rail + the active panel. Used on desktop and inside the tablet drawer. */
export function LeftPanel({
  tab,
  onTab,
  className,
}: {
  tab: PanelId
  onTab: (t: PanelId) => void
  className?: string
}) {
  return (
    <div className={cn('flex min-h-0', className)}>
      <nav
        aria-label="Panels"
        className="flex w-16 shrink-0 flex-col items-center gap-1 border-r py-2"
      >
        {LEFT_PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onTab(p.id)}
            aria-pressed={tab === p.id}
            className={cn(
              'flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted',
              tab === p.id && 'bg-accent-soft text-accent hover:bg-accent-soft',
            )}
          >
            <p.icon className="size-5" />
            {p.label}
          </button>
        ))}
      </nav>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PanelBody id={tab} />
      </div>
    </div>
  )
}
