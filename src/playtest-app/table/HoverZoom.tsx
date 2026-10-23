import { useEffect, useState } from 'react'
import { seenBy } from '@/playtest/actions'
import { PieceFace } from './Piece'
import { usePack } from './packContext'
import { usePlaytest } from './usePlaytest'

/** How long the mouse rests on a card before it zooms (ms). */
const DELAY = 300
/** The zoomed card's width (px). */
const WIDTH = 280

/** A mouse that can hover (a computer, not a phone or tablet). */
const canHover = () =>
  typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Resting the mouse on a card shows it large beside the pointer (computers
 * only). Any card on the table, the stage or the hand tray that the viewer may
 * see: elements marked `data-piece` or `data-hover-piece`.
 */
export function HoverZoom() {
  const setup = usePlaytest((s) => s.setup)
  const state = usePlaytest((s) => s.state)
  const viewer = usePlaytest((s) => s.viewer)
  const pack = usePack()
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!canHover()) return
    let current: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const clear = () => {
      current = null
      clearTimeout(timer)
      setHover(null)
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.buttons) return clear()
      const el = (e.target as Element | null)?.closest?.('[data-hover-piece],[data-piece]')
      const id = el?.getAttribute('data-hover-piece') ?? el?.getAttribute('data-piece') ?? null
      if (id !== current) {
        clear()
        current = id
        if (id) timer = setTimeout(() => setHover({ id, x: e.clientX, y: e.clientY }), DELAY)
      } else if (id) setHover((h) => h && { ...h, x: e.clientX, y: e.clientY })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', clear)
    window.addEventListener('blur', clear)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', clear)
      window.removeEventListener('blur', clear)
    }
  }, [])

  if (!hover || !setup || !state) return null
  const p = state.pieces[hover.id]
  if (!p || seenBy(setup, state, hover.id, viewer) === 'back') return null
  const f = pack.faces[p.cardId]
  const size = f ?? pack.info.cardSize
  const h = (WIDTH * Math.max(size.w, size.h)) / Math.min(size.w, size.h)
  // Beside the pointer, on whichever side has room.
  const left = hover.x + 24 + WIDTH < window.innerWidth ? hover.x + 24 : hover.x - 24 - WIDTH
  const top = Math.max(8, Math.min(hover.y - h / 2, window.innerHeight - h - 8))
  return (
    <div
      className="pointer-events-none fixed z-[700] overflow-hidden rounded-xl shadow-2xl ring-2 ring-white/70 hs-pop"
      style={{ left, top, width: WIDTH, height: h }}
      data-testid="hover-zoom"
    >
      <PieceFace piece={p} face={f} seen="face" color={setup.seats[p.owner]?.color ?? '#64748b'} />
    </div>
  )
}
