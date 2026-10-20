import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { useEditor } from '@/core/editor/editorStore'
import type { Card, Side, Template } from '@/core/model/types'
import { StaticCard } from '@/core/render/StaticCard'
import { cn } from '@/lib/cn'
import { cardContext } from '@/templates/cardContext'
import { resolveSide } from '@/templates/resolve'
import { useRenderVersion } from './useRenderVersion'

/**
 * True while the box is on screen (or near it). Thumbnails far off screen are
 * unmounted again, so long lists don't keep hundreds of canvases in memory.
 */
function useVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: '400px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, visible }
}

interface ThumbProps {
  card?: Card
  template?: Template
  side: Side
  heightPx: number
  className?: string
}

/** Live thumbnail of a card side, or of a template (with its defaults) when no card is given. */
export const CardThumb = memo(function CardThumb(props: ThumbProps) {
  const { card, template, side, heightPx, className } = props
  const templateId = template
    ? null
    : card
      ? side === 'front'
        ? card.frontTemplateId
        : card.backTemplateId
      : null
  const size = useEditor(
    (s) =>
      (template ?? (templateId ? s.doc?.templates[templateId] : undefined))?.size ??
      s.doc?.project.defaultSize,
  )
  const { ref, visible } = useVisible<HTMLSpanElement>()
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
      {visible && <ThumbCanvas {...props} templateId={templateId} widthPx={widthPx} />}
    </span>
  )
})

/** The drawing itself; only mounted while visible, so hidden thumbnails cost nothing. */
function ThumbCanvas({
  card,
  template,
  side,
  templateId,
  widthPx,
}: ThumbProps & { templateId: string | null; widthPx: number }) {
  // Only what this thumbnail shows: its template, styles, and its number / total / keywords.
  const fromDoc = useEditor((s) => (templateId ? s.doc?.templates[templateId] : undefined))
  const t = template ?? fromDoc
  const presets = useEditor((s) => s.doc?.stylePresets)
  const number = useEditor((s) =>
    s.doc ? cardContext(s.doc.project, s.doc.cards, card?.id).number : 1,
  )
  const total = useEditor((s) => (s.doc ? Object.keys(s.doc.cards).length : 0))
  const keywords = useEditor((s) => s.doc?.project.keywords)
  const version = useRenderVersion()
  const nodes = useMemo(
    () => resolveSide(t, card, side, 'card', presets, { number, total, keywords: keywords ?? [] }),
    [t, card, side, presets, number, total, keywords],
  )
  if (!t) return null
  return (
    <StaticCard
      nodes={nodes}
      widthMm={t.size.widthMm}
      heightMm={t.size.heightMm}
      widthPx={widthPx}
      assets={assetResolver}
      renderVersion={version}
    />
  )
}
