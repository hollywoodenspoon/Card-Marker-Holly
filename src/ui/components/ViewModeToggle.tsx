import { cn } from '@/lib/cn'
import { Grid2x2, List, Rows3, Table2 } from '@/ui/icons'
import type { ViewMode } from './viewMode'

const MODES: { id: ViewMode; label: string; icon: typeof List }[] = [
  { id: 'large', label: 'Large list', icon: Rows3 },
  { id: 'small', label: 'Small list', icon: List },
  { id: 'grid', label: 'Grid', icon: Grid2x2 },
  { id: 'details', label: 'Details', icon: Table2 },
]

/** Large list · small list · grid · details, as a row of small buttons. */
export function ViewModeToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode
  onChange: (m: ViewMode) => void
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label="View"
      className={cn('flex shrink-0 items-center rounded-md bg-muted p-0.5', className)}
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          aria-label={m.label}
          title={m.label}
          data-testid={`view-${m.id}`}
          onClick={() => onChange(m.id)}
          className={cn(
            'grid size-8 place-items-center rounded text-muted-foreground transition-colors pointer-coarse:size-11',
            'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            value === m.id && 'bg-panel text-foreground shadow-sm',
          )}
        >
          <m.icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
