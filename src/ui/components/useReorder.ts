import { useCallback, useEffect, useRef, useState } from 'react'

type Drag = { from: number; over: number }

/**
 * Pointer-based list reordering (works with mouse, pen and touch).
 * Attach `handleProps(index)` to a drag handle inside each row and `rowRef(index)` to the row.
 * `handleProps` and `rowRef` keep their identity between renders, so memoized
 * rows can take them without re-rendering; the drag state lives in a ref.
 */
export function useReorder(onMove: (from: number, to: number) => void) {
  const rows = useRef<(HTMLElement | null)[]>([])
  const [state, setState] = useState<Drag | null>(null)
  const live = useRef<Drag | null>(null)
  const move = useRef(onMove)
  useEffect(() => {
    move.current = onMove
  })
  const set = (d: Drag | null) => {
    live.current = d
    setState(d)
  }

  const handleProps = useCallback(
    (index: number) => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        set({ from: index, over: index })
      },
      onPointerMove: (e: React.PointerEvent) => {
        const d = live.current
        if (!d) return
        let over = rows.current.length
        for (let i = 0; i < rows.current.length; i++) {
          const r = rows.current[i]?.getBoundingClientRect()
          if (r && e.clientY < r.top + r.height / 2) {
            over = i
            break
          }
        }
        if (over !== d.over) set({ ...d, over })
      },
      onPointerUp: () => {
        const d = live.current
        if (d) {
          // `over` is an insertion slot; convert to the final index.
          const to = d.over > d.from ? d.over - 1 : d.over
          if (to !== d.from) move.current(d.from, to)
        }
        set(null)
      },
      onPointerCancel: () => set(null),
      style: { touchAction: 'none' as const, cursor: 'grab' },
    }),
    [],
  )

  const rowRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      rows.current[index] = el
    },
    [],
  )

  return { handleProps, rowRef, dragging: state }
}
