import { Check } from 'lucide-react'
import { setView, useEditor } from '@/core/editor/editorStore'
import { findSurfaceElement } from '@/core/editor/selectors'
import type { TextElement } from '@/core/model/types'
import { useTextLayout } from '@/core/render/textDraw'
import { pxPerMm, useViewport } from '@/core/render/viewport'
import { CSS_PX_PER_MM } from '@/core/units/units'
import { Button } from '@/ui/components/ui/button'
import { useTextValue } from '@/ui/panels/properties/useFieldValues'
import { RichTextEditor } from '@/ui/text/RichTextEditor'
import { useRenderVersion } from './useRenderVersion'

const done = () => setView({ editingTextId: null })

/** In-place text editing over the canvas (desktop/tablet) or in a panel (phone). */
export function TextEditOverlay({ phone }: { phone: boolean }) {
  const id = useEditor((s) => s.view.editingTextId)
  const el = useEditor((s) => (id ? findSurfaceElement(s, id) : undefined))
  if (!id || el?.type !== 'text') return null
  return <Overlay key={id} el={el} phone={phone} />
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
  const layout = useTextLayout(el, { kind: 'text', text: text ?? { paragraphs: [] } }, version)
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
          <div className="absolute top-8 left-1/2 z-20 -translate-x-1/2" onPointerDown={stop}>
            {toolbar}
          </div>
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
