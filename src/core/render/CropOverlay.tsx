import type Konva from 'konva'
import { Group, Image as KImage, Rect } from 'react-konva'
import { updateElements } from '../editor/elementCommands'
import type { Element, ImageValue } from '../model/types'
import { FULL_CROP, framePlacement } from './imageMath'
import type { AssetResolver } from './renderTypes'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/**
 * Crop / reposition mode. Shows the whole picture faded behind the frame and
 * lets the user drag it. Image elements change their crop; image fields
 * change the card's offset (through `onFrameChange`).
 */
export function CropOverlay({
  el,
  assets,
  fieldValue,
  onFrameChange,
}: {
  el: Element
  assets: AssetResolver
  fieldValue?: ImageValue
  onFrameChange?: (patch: Partial<ImageValue>) => void
}) {
  if (el.type !== 'image' && el.type !== 'imageField') return null
  const assetId = el.type === 'image' ? el.assetId : fieldValue?.assetId
  if (!assetId) return null
  const img = assets.getImage(assetId)
  const info = assets.getInfo(assetId)
  if (!img || !info) return null
  const { widthPx: iw, heightPx: ih } = info

  let ghost: { x: number; y: number; w: number; h: number }
  let onDrag: (n: Konva.Node) => void

  if (el.type === 'image') {
    const c = el.crop ?? FULL_CROP
    const sx = el.wMm / (c.w * iw)
    const sy = el.hMm / (c.h * ih)
    ghost = { x: -c.x * iw * sx, y: -c.y * ih * sy, w: iw * sx, h: ih * sy }
    onDrag = (n) => {
      const cx = clamp(-n.x() / (iw * sx), 0, 1 - c.w)
      const cy = clamp(-n.y() / (ih * sy), 0, 1 - c.h)
      n.position({ x: -cx * iw * sx, y: -cy * ih * sy })
      updateElements(
        [el.id],
        (e) => {
          if (e.type === 'image') e.crop = { ...c, x: cx, y: cy }
        },
        'crop:' + el.id,
      )
    }
  } else {
    const v = fieldValue!
    const p = framePlacement(el.wMm, el.hMm, iw, ih, v)
    ghost = { x: p.x, y: p.y, w: p.w, h: p.h }
    onDrag = (n) => {
      onFrameChange?.({
        offsetXMm: n.x() - (el.wMm - p.w) / 2,
        offsetYMm: n.y() - (el.hMm - p.h) / 2,
      })
    }
  }

  return (
    <Group x={el.xMm} y={el.yMm} rotation={el.rotation}>
      <Group
        x={el.flipX ? el.wMm : 0}
        y={el.flipY ? el.hMm : 0}
        scaleX={el.flipX ? -1 : 1}
        scaleY={el.flipY ? -1 : 1}
      >
        <KImage
          image={img}
          x={ghost.x}
          y={ghost.y}
          width={ghost.w}
          height={ghost.h}
          opacity={0.4}
          draggable
          onPointerDown={(e) => (e.cancelBubble = true)}
          onDragMove={(e) => onDrag(e.target)}
        />
        <Rect
          width={el.wMm}
          height={el.hMm}
          stroke="#0e9494"
          strokeWidth={2}
          strokeScaleEnabled={false}
          listening={false}
        />
      </Group>
    </Group>
  )
}
