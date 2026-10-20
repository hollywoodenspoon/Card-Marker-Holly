import { Maximize, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from './ui/button'

/** − % + fit, like the card editor's zoom controls (bottom right). */
export function ZoomBar({
  zoom,
  onZoom,
  onFit,
  className,
  label = (z: number) => `${Math.round(z * 100)}%`,
}: {
  zoom: number
  onZoom: (factor: number) => void
  onFit: () => void
  className?: string
  label?: (z: number) => string
}) {
  return (
    <div
      className={cn(
        'absolute right-3 bottom-3 z-10 flex items-center gap-0.5 rounded-xl border bg-panel/95 p-1 text-foreground shadow-md backdrop-blur',
        className,
      )}
    >
      <IconButton label="Zoom out" size="icon-sm" onClick={() => onZoom(1 / 1.25)}>
        <Minus />
      </IconButton>
      <button
        type="button"
        onClick={onFit}
        className="h-11 min-w-12 rounded-md px-1 text-xs font-medium tabular-nums hover:bg-muted md:h-8"
        title="Fit to screen"
        data-testid="zoom-label"
      >
        {label(zoom)}
      </button>
      <IconButton label="Zoom in" size="icon-sm" onClick={() => onZoom(1.25)}>
        <Plus />
      </IconButton>
      <IconButton label="Fit to screen" size="icon-sm" onClick={onFit}>
        <Maximize />
      </IconButton>
    </div>
  )
}
