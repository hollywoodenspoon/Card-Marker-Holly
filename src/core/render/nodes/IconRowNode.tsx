import { Image as KImage, Rect, Text } from 'react-konva'
import type { IconRowElement } from '../../model/types'
import { iconRowLayout } from '../iconRowLayout'
import { useStageCtx } from '../stageContext'

export function IconRowNode({ el, count }: { el: IconRowElement; count: number }) {
  const ctx = useStageCtx()
  const img = el.assetId ? ctx.assets.getImage(el.assetId) : undefined
  const info = el.assetId ? ctx.assets.getInfo(el.assetId) : undefined
  const outline = (opacity: number) => (
    <Rect
      width={el.wMm}
      height={el.hMm}
      stroke="#8d8d97"
      strokeWidth={1}
      dash={[4, 3]}
      strokeScaleEnabled={false}
      opacity={opacity}
      listening={false}
    />
  )
  // Hit area: the whole box is grabbable, not just the icons.
  const hit = <Rect width={el.wMm} height={el.hMm} fill="transparent" />

  if (!el.assetId || !info) {
    if (ctx.static) return null
    return (
      <>
        {hit}
        {outline(1)}
        <Text
          width={el.wMm}
          height={el.hMm}
          text="Choose icon"
          align="center"
          verticalAlign="middle"
          fontFamily="Inter"
          fontSize={Math.max(1.2, Math.min(3, el.hMm / 3))}
          fill="#7a7a85"
          listening={false}
        />
      </>
    )
  }
  const rects = iconRowLayout({ w: el.wMm, h: el.hMm }, count, info.widthPx / info.heightPx, el)
  return (
    <>
      {hit}
      {!rects.length && !ctx.static && outline(0.5)}
      {img &&
        rects.map((r, i) => (
          <KImage key={i} image={img} x={r.x} y={r.y} width={r.w} height={r.h} listening={false} />
        ))}
    </>
  )
}
