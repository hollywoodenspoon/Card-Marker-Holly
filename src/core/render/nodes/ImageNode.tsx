import { Image as KImage, Rect } from 'react-konva'
import type { ImageElement } from '../../model/types'
import { FULL_CROP } from '../imageMath'
import { useStageCtx } from '../stageContext'

export function ImageNode({ el }: { el: ImageElement }) {
  const ctx = useStageCtx()
  const img = ctx.assets.getImage(el.assetId)
  const info = ctx.assets.getInfo(el.assetId)
  if (!img || !info) return <Rect width={el.wMm} height={el.hMm} fill="#e4e4e8" />
  const c = el.crop ?? FULL_CROP
  // Crop in decoded pixels (SVGs are decoded larger than their intrinsic size).
  const nw = (img as HTMLImageElement).naturalWidth || info.widthPx
  const nh = (img as HTMLImageElement).naturalHeight || info.heightPx
  return (
    <KImage
      image={img}
      width={el.wMm}
      height={el.hMm}
      crop={{
        x: c.x * nw,
        y: c.y * nh,
        width: c.w * nw,
        height: c.h * nh,
      }}
    />
  )
}
