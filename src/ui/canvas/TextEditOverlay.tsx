import { Check } from '@/ui/icons'
import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { setView, useEditor } from '@/core/editor/editorStore'
import { findSurfaceElement } from '@/core/editor/selectors'
import type { TextElement } from '@/core/model/types'
import { assetResolver } from '@/assets/assetResolver'
import { effectiveText } from '@/templates/resolve'
import { useTextLayout } from '@/core/render/textDraw'
import { pxPerMm, useViewport } from '@/core/render/viewport'
import { CSS_PX_PER_MM } from '@/core/units/units'
import { Button } from '@/ui/components/ui/button'
import { useTextValue } from '@/ui/panels/properties/useFieldValues'
import { useRenderVersion } from './useRenderVersion'

const done = () => setView({ editingTextId: null })

// The editor (Tiptap/ProseMirror) loads only when text editing starts.
const RichTextEditor = lazy(() =>
  import('@/ui/text/RichTextEditor').then((m) => ({ default: m.RichTextEditor })),
)

/** In-place text editing over the canvas (desktop/tablet) or in a panel (phone). */
export function TextEditOverlay({ phone }: { phone: boolean }) {
  const id = useEditor((s) => s.view.editingTextId)
  const el = useEditor((s) => (id ? findSurfaceElement(s, id) : undefined))
  const presets = useEditor((s) => s.doc?.stylePresets)
  if (!id || el?.type !== 'text') return null
  return (
    <Suspense fallback={null}>
      <Overlay key={id} el={effectiveText(el, presets)} phone={phone} />
    </Suspense>
  )
}

/** The element's box in real CSS mm, scaled by `scale`. */
function TextBox({
  el,
  scale,
  children,
}: {
  el: TextElement
  scale: number
  children: React.ReactNode
}) {
  const justify =
    el.vAlign === 'middle' ? 'center' : el.vAlign === 'bottom' ? 'flex-end' : 'flex-start'
  return (
    <div
      style={{
        width: `${el.wMm}mm`,
        height: `${el.hMm}mm`,
        padding: `${el.paddingMm}mm`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {children}
    </div>
  )
}

function Overlay({ el, phone }: { el: TextElement; phone: boolean }) {
  const { zoom, panX, panY } = useViewport()
  const text = useTextValue(el.id)
  const version = useRenderVersion()
  const layout = useTextLayout(
    el,
    { kind: 'text', text: text ?? { paragraphs: [] } },
    version,
    (n) => assetResolver.findSymbol(n),
  )
  const k = pxPerMm(zoom)
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  if (phone) {
    // A panel at the top: comfortable size to type, the canvas below shows the result live.
    const panelScale = Math.min(3, (window.innerWidth - 24) / (el.wMm * CSS_PX_PER_MM))
    return (
      <RichTextEditor el={el} onDone={done} contentScale={layout.scale}>
        {(toolbar, content) => (
          <div
            className="absolute inset-x-0 top-0 z-20 flex flex-col gap-2 border-b bg-panel p-3 shadow-lg"
            onPointerDown={stop}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 overflow-x-auto">{toolbar}</div>
              <Button size="sm" onClick={done}>
                <Check /> Done
              </Button>
            </div>
            <div
              className="overflow-auto rounded-lg border bg-white"
              style={{ height: el.hMm * CSS_PX_PER_MM * panelScale + 2, maxHeight: '35dvh' }}
            >
              <TextBox el={el} scale={panelScale}>
                {content}
              </TextBox>
            </div>
          </div>
        )}
      </RichTextEditor>
    )
  }

  return (
    <RichTextEditor el={el} onDone={done} contentScale={layout.scale}>
      {(toolbar, content) => (
        <>
          <FloatingToolbar
            box={{
              left: panX + el.xMm * k,
              top: panY + el.yMm * k,
              width: el.wMm * k,
              height: el.hMm * k,
            }}
            onPointerDown={stop}
          >
            {toolbar}
          </FloatingToolbar>
          <div
            className="absolute z-10 outline-2 outline-accent outline-solid"
            style={{
              left: panX + el.xMm * k,
              top: panY + el.yMm * k,
              width: el.wMm * k,
              height: el.hMm * k,
              transform: `rotate(${el.rotation}deg)`,
              transformOrigin: 'top left',
            }}
            onPointerDown={stop}
          >
            <TextBox el={el} scale={zoom}>
              {content}
            </TextBox>
          </div>
        </>
      )}
    </RichTextEditor>
  )
}

/**
 * The text toolbar, just above the text being edited (below it when there's no
 * room above), centred on it and kept inside the canvas, so it never covers the text.
 */
function FloatingToolbar({
  box,
  children,
  onPointerDown,
}: {
  box: { left: number; top: number; width: number; height: number }
  children: React.ReactNode
  onPointerDown: (e: React.PointerEvent) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0, areaW: 0, areaH: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () =>
      setSize({
        w: el.offsetWidth,
        h: el.offsetHeight,
        areaW: el.parentElement?.clientWidth ?? 0,
        areaH: el.parentElement?.clientHeight ?? 0,
      })
    measure()
    // The canvas too: a resized window or an opened drawer moves the limits.
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [])
  const gap = 8
  const above = box.top - size.h - gap
  const below = box.top + box.height + gap
  // Above, else below, else (a tall box, zoomed in) pinned to the top of the canvas.
  const top = above >= gap ? above : below + size.h <= size.areaH - gap ? below : gap
  const centred = box.left + box.width / 2 - size.w / 2
  const left = Math.max(gap, Math.min(centred, size.areaW - size.w - gap))
  return (
    <div
      ref={ref}
      className="absolute z-20"
      // Hidden until measured, so it doesn't flash in the wrong place.
      style={{ top, left, visibility: size.w ? 'visible' : 'hidden' }}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  )
}
