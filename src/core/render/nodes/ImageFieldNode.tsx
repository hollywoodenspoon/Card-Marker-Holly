import type Konva from 'konva'
import { Group, Image as KImage, Rect, Text } from 'react-konva'
import type { ImageFieldElement, ImageValue } from '../../model/types'
import { framePlacement } from '../imageMath'
import { useStageCtx } from '../stageContext'

function roundedClip(w: number, h: number, r: number) {
  return (c: Konva.Context) => {
    const rr = Math.min(r, w / 2, h / 2)
    c.beginPath()
    c.moveTo(rr, 0)
    c.arcTo(w, 0, w, h, rr)
    c.arcTo(w, h, 0, h, rr)
    c.arcTo(0, h, 0, 0, rr)
    c.arcTo(0, 0, w, 0, rr)
    c.closePath()
  }
}

export function ImageFieldNode({ el, value }: { el: ImageFieldElement; value: ImageValue }) {
  const ctx = useStageCtx()
  const img = value.assetId ? ctx.assets.getImage(value.assetId) : undefined
  const info = value.assetId ? ctx.assets.getInfo(value.assetId) : undefined
  if (!img || !info) {
    return (
      <Group clipFunc={roundedClip(el.wMm, el.hMm, el.radiusMm)}>
        <Rect width={el.wMm} height={el.hMm} fill={el.placeholderColor} />
        {!ctx.static && !value.assetId && <PlaceholderLabel el={el} />}
      </Group>
    )
  }
  const p = framePlacement(el.wMm, el.hMm, info.widthPx, info.heightPx, value)
  return (
    <Group clipFunc={roundedClip(el.wMm, el.hMm, el.radiusMm)}>
      <Rect
        width={el.wMm}
        height={el.hMm}
        fill={el.placeholderColor}
        opacity={value.fit === 'fit' ? 1 : 0}
      />
      <KImage image={img} x={p.x} y={p.y} width={p.w} height={p.h} />
    </Group>
  )
}

/** "Art" plus a hint, sized to the box. Never drawn in thumbnails. */
function PlaceholderLabel({ el }: { el: ImageFieldElement }) {
  const big = Math.max(1.5, Math.min(4, el.hMm / 5, el.wMm / 6))
  const small = big * 0.5
  const gap = big * 0.35
  const top = (el.hMm - (big + gap + small)) / 2
  return (
    <>
      <Text
        width={el.wMm}
        y={top}
        text={el.name}
        align="center"
        fontFamily="Inter"
        fontSize={big}
        fill="#7a7a85"
      />
      <Text
        width={el.wMm}
        y={top + big + gap}
        text="Double-tap to add image"
        align="center"
        fontFamily="Inter"
        fontSize={small}
        fill="#8d8d97"
      />
    </>
  )
}
