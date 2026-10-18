import { useEffect, useMemo, useRef, useState } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { useEditor } from '@/core/editor/editorStore'
import type { Card, Side, Template } from '@/core/model/types'
import { StaticCard } from '@/core/render/StaticCard'
import { cn } from '@/lib/cn'
import { resolveSide } from '@/templates/resolve'
import { useRenderVersion } from './useRenderVersion'

/** Renders only once scrolled into view. */
function useVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), {
      rootMargin: '200px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, visible }
}

/** Live thumbnail of a card side, or of a template (with its defaults) when no card is given. */
export function CardThumb({
  card,
  template,
  side,
  heightPx,
  className,
}: {
  card?: Card
  template?: Template
  side: Side
  heightPx: number
  className?: string
}) {
  const templates = useEditor((s) => s.doc?.templates)
  const t =
    template ??
    (card
      ? templates?.[(side === 'front' ? card.frontTemplateId : card.backTemplateId) ?? '']
      : undefined)
  const version = useRenderVersion()
  const nodes = useMemo(() => resolveSide(t, card, side, 'card'), [t, card, side])
  const { ref, visible } = useVisible<HTMLSpanElement>()
  const size = t?.size ?? useEditor.getState().doc?.project.defaultSize
  if (!size) return null
  const widthPx = Math.round((heightPx * size.widthMm) / size.heightMm)
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        'block shrink-0 overflow-hidden rounded-[3px] bg-white shadow-sm ring-1 ring-black/10',
        className,
      )}
      style={{ width: widthPx, height: heightPx }}
    >
      {visible && t && (
        <StaticCard
          nodes={nodes}
          widthMm={size.widthMm}
          heightMm={size.heightMm}
          widthPx={widthPx}
          assets={assetResolver}
          renderVersion={version}
        />
      )}
    </span>
  )
}
