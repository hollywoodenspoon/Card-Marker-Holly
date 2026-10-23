import { useLayoutEffect, useRef } from 'react'
import { usePack } from './packContext'
import { usePlaytest } from './usePlaytest'

/** How long a card takes to fly (ms). */
const FLIGHT_MS = 420

/**
 * Cards visibly travel between the table and the combat stage: a Fighting
 * Spirit card flies from its player's hand onto the stage. (Moves on the
 * table itself already slide.) Each frame remembers where every card was on
 * screen; a card that appears on the stage flies there from its last place,
 * as a picture drawn and removed here (no re-render).
 */
export function Flights() {
  const state = usePlaytest((s) => s.state)
  const speed = usePlaytest((s) => s.speed)
  const pack = usePack()
  const ref = useRef<HTMLDivElement>(null)
  const last = useRef<{ table: Map<string, DOMRect>; stage: Set<string> }>({
    table: new Map(),
    stage: new Set(),
  })

  useLayoutEffect(() => {
    const layer = ref.current
    const root = layer?.parentElement
    if (!layer || !root || !state) return
    const table = new Map<string, DOMRect>()
    for (const el of root.querySelectorAll<HTMLElement>('[data-piece]'))
      table.set(el.dataset.piece!, el.getBoundingClientRect())
    const stage = new Map<string, DOMRect>()
    for (const el of root.querySelectorAll<HTMLElement>('[data-stage][data-hover-piece]'))
      stage.set(el.dataset.hoverPiece!, el.getBoundingClientRect())
    const prev = last.current
    last.current = { table, stage: new Set(stage.keys()) }
    const reduce = matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (speed === 'rush' || reduce) return
    const box = root.getBoundingClientRect()
    for (const [id, to] of stage) {
      const from = prev.table.get(id)
      const src = pack.faces[state.pieces[id]?.cardId ?? '']?.front
      if (prev.stage.has(id) || !from || !src) continue
      const ghost = document.createElement('img')
      ghost.src = src
      ghost.alt = ''
      ghost.dataset.testid = 'flight'
      Object.assign(ghost.style, {
        position: 'absolute',
        left: `${to.left - box.left}px`,
        top: `${to.top - box.top}px`,
        width: `${to.width}px`,
        height: `${to.height}px`,
        objectFit: 'cover',
        borderRadius: '5%',
        boxShadow: '0 0 0 2px #fde047, 0 12px 30px rgba(0,0,0,.5)',
      })
      layer.appendChild(ghost)
      const dx = from.left + from.width / 2 - (to.left + to.width / 2)
      const dy = from.top + from.height / 2 - (to.top + to.height / 2)
      const s = from.height / to.height
      const run = ghost.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.9 },
          { transform: 'scale(1.08)', opacity: 1, offset: 0.8 },
          { transform: 'none', opacity: 0 },
        ],
        { duration: FLIGHT_MS, easing: 'cubic-bezier(.2,.8,.3,1)' },
      )
      run.onfinish = () => ghost.remove()
    }
  }, [state, speed, pack])

  return <div ref={ref} className="pointer-events-none absolute inset-0 z-[345] overflow-hidden" />
}
