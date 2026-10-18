import type Konva from 'konva'
import { Group, Rect, Shape } from 'react-konva'
import type { TextElement, TextValue } from '../../model/types'
import { drawLayout, useTextLayout } from '../textDraw'
import { useStageCtx } from '../stageContext'

export function TextNode({ el, value }: { el: TextElement; value: TextValue }) {
  const ctx = useStageCtx()
  const layout = useTextLayout(el, value, ctx.renderVersion)
  return (
    <Group>
      {/* hit area: the whole box is grabbable, not just the glyphs */}
      <Rect width={el.wMm} height={el.hMm} fill="transparent" />
      <Shape
        listening={false}
        sceneFunc={(c: Konva.Context) =>
          drawLayout(c._context as CanvasRenderingContext2D, layout, el.paddingMm)
        }
      />
      {layout.overflow && !ctx.static && (
        <Rect
          width={el.wMm}
          height={el.hMm}
          stroke="#e5484d"
          strokeWidth={1}
          dash={[3, 2]}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
    </Group>
  )
}
