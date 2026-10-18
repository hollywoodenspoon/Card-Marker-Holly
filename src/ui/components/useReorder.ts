import { useRef, useState } from 'react'

/**
 * Pointer-based list reordering (works with mouse, pen and touch).
 * Attach `handleProps(index)` to a drag handle inside each row and `rowRef(index)` to the row.
 */
export function useReorder(onMove: (from: number, to: number) => void) {
  const rows = useRef<(HTMLElement | null)[]>([])
  const [state, setState] = useState<{ from: number; over: number } | null>(null)

  const indexAt = (y: number) => {
    let idx = rows.current.length
    for (let i = 0; i < rows.current.length; i++) {
      const r = rows.current[i]?.getBoundingClientRect()
      if (r && y < r.top + r.height / 2) {
        idx = i
        break
      }
    }
    return idx
  }

  const handleProps = (index: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      setState({ from: index, over: index })
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!state) return
      const over = indexAt(e.clientY)
      if (over !== state.over) setState({ ...state, over })
    },
    onPointerUp: () => {
      if (state) {
        // `over` is an insertion slot; convert to the final index.
        const to = state.over > state.from ? state.over - 1 : state.over
        if (to !== state.from) onMove(state.from, to)
      }
      setState(null)
    },
    onPointerCancel: () => setState(null),
    style: { touchAction: 'none' as const, cursor: 'grab' },
  })

  const rowRef = (index: number) => (el: HTMLElement | null) => {
    rows.current[index] = el
  }

  return { handleProps, rowRef, dragging: state }
}
