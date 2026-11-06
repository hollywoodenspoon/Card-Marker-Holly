import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { Dir } from '@/urban/state'

/** How long a card takes to slide, land or leave (ms). */
export const MOVE_MS = 650

const OUT: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

/**
 * Cards move visibly, Master Duel style: each render remembers where every
 * card (`data-uw-card`) was on screen. A field card that moved slides from its
 * old place; a new field card flies in from where it was (the hand, or the
 * other player's counts for a hidden hand); a field card that is gone is drawn
 * once more at its old place and flies off the field in the push direction.
 * A card a Fighter-Bomber hits (`blast`) explodes instead.
 */
export function useUrbanMotion(
  root: RefObject<HTMLElement | null>,
  key: unknown,
  dir: Dir | null,
  off: boolean,
  blast = false,
) {
  const last = useRef(new Map<string, { rect: DOMRect; field: boolean; el: HTMLElement }>())
  useLayoutEffect(() => {
    const box = root.current
    if (!box) return
    const now = new Map<string, { rect: DOMRect; field: boolean; el: HTMLElement }>()
    for (const el of box.querySelectorAll<HTMLElement>('[data-uw-card]'))
      now.set(el.dataset.uwCard!, {
        rect: el.getBoundingClientRect(),
        field: el.dataset.uwField === '1',
        el,
      })
    const prev = last.current
    last.current = new Map(
      [...now].map(([id, v]) => [id, { ...v, el: v.el.cloneNode(true) as HTMLElement }]),
    )
    const reduce = matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (off || reduce || prev.size === 0) return
    const ease = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    const from = box.querySelector<HTMLElement>('[data-uw-from]')?.getBoundingClientRect()
    for (const [id, n] of now) {
      if (!n.field) continue
      const p = prev.get(id)
      const start = p?.rect ?? from
      if (!start) continue
      const dx = start.left - n.rect.left
      const dy = start.top - n.rect.top
      const sx = start.width / n.rect.width
      if (p?.field && Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      n.el.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${p?.field ? 1 : p ? sx : 0.6})`,
            opacity: p ? 1 : 0.3,
            zIndex: 20,
          },
          { transform: 'none', opacity: 1, zIndex: 20 },
        ],
        { duration: MOVE_MS, easing: ease },
      )
    }
    // Cards that left the field fly off it.
    const [ox, oy] = dir ? OUT[dir] : [0, 1]
    for (const [id, p] of prev) {
      if (!p.field || now.get(id)?.field) continue
      const ghost = p.el
      Object.assign(ghost.style, {
        position: 'fixed',
        left: `${p.rect.left}px`,
        top: `${p.rect.top}px`,
        width: `${p.rect.width}px`,
        height: `${p.rect.height}px`,
        margin: '0',
        zIndex: '400',
        pointerEvents: 'none',
      })
      document.body.appendChild(ghost)
      if (blast) {
        explode(ghost, p.rect)
        continue
      }
      const a = ghost.animate(
        [
          { transform: 'none', opacity: 1, filter: 'none' },
          {
            transform: `translate(${ox * p.rect.width * 0.4}px, ${oy * p.rect.height * 0.4}px)`,
            opacity: 1,
            filter: 'brightness(1.6) drop-shadow(0 0 12px #f43f5e)',
            offset: 0.35,
          },
          {
            transform: `translate(${ox * p.rect.width * 1.6}px, ${oy * p.rect.height * 1.6}px) rotate(${ox * 25 + oy * 10}deg) scale(0.7)`,
            opacity: 0,
            filter: 'grayscale(1)',
          },
        ],
        { duration: MOVE_MS * 1.8, easing: 'ease-in', delay: MOVE_MS * 0.4, fill: 'backwards' },
      )
      a.onfinish = a.oncancel = () => ghost.remove()
    }
  }, [root, key, dir, off, blast])
}

/** A Fighter-Bomber hit: flash, a burst ring and sparks, then the card shrinks away. */
function explode(ghost: HTMLElement, r: DOMRect) {
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const size = Math.max(r.width, r.height) * 1.6
  const parts: HTMLElement[] = [ghost]
  const add = (css: Partial<CSSStyleDeclaration>) => {
    const el = document.createElement('div')
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '401',
      borderRadius: '9999px',
      ...css,
    })
    document.body.appendChild(el)
    parts.push(el)
    return el
  }
  const delay = MOVE_MS * 0.3
  const shake = ghost.animate(
    [
      { transform: 'none', filter: 'none', opacity: 1 },
      { transform: 'translate(-4px, 2px)', filter: 'brightness(2.5)', opacity: 1, offset: 0.15 },
      {
        transform: 'translate(4px, -2px) scale(1.05)',
        filter: 'brightness(2) sepia(1) hue-rotate(-30deg)',
        opacity: 1,
        offset: 0.3,
      },
      { transform: 'scale(0.4) rotate(8deg)', filter: 'grayscale(1) brightness(0.4)', opacity: 0 },
    ],
    { duration: MOVE_MS * 1.6, easing: 'ease-in', delay, fill: 'backwards' },
  )
  const flash = add({
    left: `${cx - size / 2}px`,
    top: `${cy - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    background: 'radial-gradient(circle, #fff 0%, #fde047 25%, #f97316 50%, rgba(220,38,38,0) 70%)',
    opacity: '0',
  })
  flash.animate(
    [
      { transform: 'scale(0.2)', opacity: 1 },
      { transform: 'scale(1)', opacity: 0.9, offset: 0.4 },
      { transform: 'scale(1.3)', opacity: 0 },
    ],
    { duration: MOVE_MS * 1.2, easing: 'ease-out', delay, fill: 'both' },
  )
  const ring = add({
    left: `${cx - size / 2}px`,
    top: `${cy - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    border: '4px solid #f97316',
    opacity: '0',
  })
  ring.animate(
    [
      { transform: 'scale(0.3)', opacity: 1 },
      { transform: 'scale(1.5)', opacity: 0 },
    ],
    { duration: MOVE_MS * 1.1, easing: 'ease-out', delay, fill: 'both' },
  )
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const d = size * (0.6 + (i % 3) * 0.15)
    const spark = add({
      left: `${cx - 4}px`,
      top: `${cy - 4}px`,
      width: '8px',
      height: '8px',
      background: i % 2 ? '#fde047' : '#f97316',
      boxShadow: '0 0 8px #f97316',
      opacity: '0',
    })
    spark.animate(
      [
        { transform: 'none', opacity: 1 },
        {
          transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0.3)`,
          opacity: 0,
        },
      ],
      { duration: MOVE_MS * 1.2, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', delay, fill: 'both' },
    )
  }
  shake.onfinish = shake.oncancel = () => parts.forEach((el) => el.remove())
}
