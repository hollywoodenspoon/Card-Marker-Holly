import { useCallback, useEffect, useRef, useState } from 'react'

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** True while the Space bar is held (not while typing). Space is kept from scrolling the page. */
export function useSpaceHeld() {
  const held = useRef(false)
  const [down, setDown] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return
      e.preventDefault()
      if (!held.current) {
        held.current = true
        setDown(true)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && held.current) {
        held.current = false
        setDown(false)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  return { held, down }
}

export interface PanZoomOptions {
  min?: number
  max?: number
  /** Called with a zoom factor and the screen point (relative to the box) to zoom at. */
  onZoom?: (factor: number, at: { x: number; y: number }) => void
  /** Called with a drag / wheel offset in screen pixels. */
  onPan?: (dx: number, dy: number) => void
  /** Ctrl/⌘ 0. */
  onFit?: () => void
}

/**
 * The card editor's view controls for any box: hold Space or the middle mouse
 * button and drag to pan, Ctrl/⌘ + wheel to zoom at the pointer, the wheel to
 * pan, pinch to zoom on touch, Ctrl/⌘ 0 to fit and Ctrl/⌘ + / − to zoom.
 * Give it the box's ref; spread the returned handlers on the box.
 */
export function usePanZoom(ref: React.RefObject<HTMLElement | null>, opts: PanZoomOptions) {
  const space = useSpaceHeld()
  const o = useRef(opts)
  useEffect(() => {
    o.current = opts
  })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number } | null>(null)
  const pinch = useRef<{ d: number; mid: { x: number; y: number } } | null>(null)
  const [panning, setPanning] = useState(false)

  const local = useCallback(
    (x: number, y: number) => {
      const r = ref.current!.getBoundingClientRect()
      return { x: x - r.left, y: y - r.top }
    },
    [ref],
  )

  // Wheel needs a non-passive listener so Ctrl + wheel doesn't zoom the page.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        o.current.onZoom?.(Math.exp(-e.deltaY * 0.01), local(e.clientX, e.clientY))
      } else if (o.current.onPan) {
        e.preventDefault()
        o.current.onPan(-e.deltaX, -e.deltaY)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [local, ref])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isTyping(e.target)) return
      const el = ref.current
      // Not on screen (a hidden workspace or view): leave the keys alone.
      if (!el || !el.getClientRects().length) return
      const mid = { x: el.clientWidth / 2, y: el.clientHeight / 2 }
      if (e.key === '0') o.current.onFit?.()
      else if (e.key === '=' || e.key === '+') o.current.onZoom?.(1.25, mid)
      else if (e.key === '-') o.current.onZoom?.(1 / 1.25, mid)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ref])

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()]
        pinch.current = {
          d: Math.hypot(a.x - b.x, a.y - b.y),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        }
        drag.current = null
        return
      }
      if (e.button === 1 || space.held.current) {
        e.preventDefault()
        drag.current = { x: e.clientX, y: e.clientY }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        setPanning(true)
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinch.current && pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        o.current.onPan?.(mid.x - pinch.current.mid.x, mid.y - pinch.current.mid.y)
        o.current.onZoom?.(d / Math.max(1, pinch.current.d), local(mid.x, mid.y))
        pinch.current = { d, mid }
        return
      }
      if (drag.current) {
        o.current.onPan?.(e.clientX - drag.current.x, e.clientY - drag.current.y)
        drag.current = { x: e.clientX, y: e.clientY }
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinch.current = null
      if (drag.current) {
        drag.current = null
        setPanning(false)
        // The click that ends a pan is not a click on what's underneath.
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation()
          ev.preventDefault()
        }
        window.addEventListener('click', swallow, { capture: true, once: true })
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
      }
    },
    onPointerCancel: (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId)
      pinch.current = null
      drag.current = null
      setPanning(false)
    },
    // Middle-click shouldn't start the browser's auto-scroll.
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    },
  }

  const cursor = panning ? 'grabbing' : space.down ? 'grab' : undefined
  return { handlers, cursor, panning }
}
