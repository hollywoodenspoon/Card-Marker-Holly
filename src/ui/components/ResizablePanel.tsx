import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useCoarsePointer } from '@/ui/shell/useLayout'
import { getUiScale } from '@/ui/theme/uiScale'
import { dragWidth, loadWidth, saveWidth, type PanelLimits } from './panelSize'

/**
 * A side panel you can resize by dragging its inner edge (pointer events, so mouse,
 * pen and touch). The cursor changes on the edge; on touch screens a grab handle shows
 * instead, since there is no hover. Double-click the edge to reset; with the edge
 * focused, ← and → change the width. Widths are saved per device and scale with the
 * UI size setting.
 */
export function ResizablePanel({
  id,
  side,
  initial,
  min = 200,
  max = 640,
  label,
  className,
  children,
  as: Tag = 'aside',
  ariaLabel,
}: {
  /** Saved as "cardmaker.panel.<id>". */
  id: string
  /** Which side of the screen the panel sits on; its handle is on the other edge. */
  side: 'left' | 'right'
  initial: number
  min?: number
  max?: number
  /** Names the panel for screen readers ("Resize the … panel"). */
  label: string
  className?: string
  children: ReactNode
  as?: 'aside' | 'div'
  /** The panel's own accessible name (a landmark's name). */
  ariaLabel?: string
}) {
  const limits: PanelLimits = { min, max, initial }
  const [width, setWidth] = useState(() => loadWidth(id, limits))
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; w: number } | null>(null)
  const coarse = useCoarsePointer()

  const set = (w: number) => {
    setWidth(w)
    saveWidth(id, w === initial ? null : w)
  }

  const style = { width: `calc(${width}px * var(--ui-scale, 1))` } as CSSProperties
  return (
    <Tag className={cn('relative shrink-0', className)} style={style} aria-label={ariaLabel}>
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize the ${label} panel`}
        aria-valuenow={width}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        data-testid={`resize-${id}`}
        title="Drag to resize · double-click to reset"
        className={cn(
          'group absolute inset-y-0 z-20 flex w-2 cursor-col-resize touch-none items-center justify-center outline-none',
          side === 'left' ? '-right-1' : '-left-1',
          coarse && 'w-5',
          side === 'left' ? coarse && '-right-2.5' : coarse && '-left-2.5',
        )}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          start.current = { x: e.clientX, w: width }
          setDragging(true)
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (s) setWidth(dragWidth(s.w, e.clientX - s.x, side, getUiScale(), limits))
        }}
        onPointerUp={(e) => {
          if (!start.current) return
          start.current = null
          setDragging(false)
          e.currentTarget.releasePointerCapture(e.pointerId)
          set(width)
        }}
        onPointerCancel={() => {
          start.current = null
          setDragging(false)
        }}
        onDoubleClick={() => set(initial)}
        onKeyDown={(e) => {
          // The arrow moves the edge: → widens a left panel, ← widens a right one.
          const step = e.shiftKey ? 64 : 16
          if (e.key === 'ArrowRight') set(dragWidth(width, step, side, 1, limits))
          else if (e.key === 'ArrowLeft') set(dragWidth(width, -step, side, 1, limits))
          else if (e.key === 'Home' || e.key === 'Enter') set(initial)
          else return
          e.preventDefault()
        }}
      >
        <span
          aria-hidden
          className={cn(
            'h-full w-0.5 rounded-full bg-transparent transition-colors',
            'group-hover:bg-accent/60 group-focus-visible:bg-accent',
            dragging && 'bg-accent',
            coarse && 'h-12 w-1.5 bg-border',
          )}
        />
      </div>
    </Tag>
  )
}
