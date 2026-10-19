import { Ellipse, Line, Rect } from 'react-konva'
import type { ShapeElement } from '../../model/types'

export function ShapeNode({ el }: { el: ShapeElement }) {
  const sh = el.shadow
  // Hard shadow (no blur), drawn the same way in the PDF.
  const shadow = sh
    ? {
        shadowColor: sh.color,
        shadowOffsetX: sh.dxMm,
        shadowOffsetY: sh.dyMm,
        shadowOpacity: sh.opacity,
        shadowBlur: 0,
        shadowForStrokeEnabled: true,
      }
    : {}
  const common = {
    fill: el.fill ?? undefined,
    stroke: el.stroke ?? undefined,
    strokeWidth: el.stroke ? el.strokeMm : 0,
    ...shadow,
  }
  if (el.kind === 'ellipse')
    return (
      <Ellipse
        x={el.wMm / 2}
        y={el.hMm / 2}
        radiusX={el.wMm / 2}
        radiusY={el.hMm / 2}
        {...common}
      />
    )
  if (el.kind === 'line')
    return (
      <>
        {/* invisible hit area so thin lines stay grabbable */}
        <Rect width={el.wMm} height={Math.max(el.hMm, 0.01)} fill="transparent" />
        <Line
          points={[0, el.hMm / 2, el.wMm, el.hMm / 2]}
          stroke={el.stroke ?? el.fill ?? '#000'}
          strokeWidth={el.strokeMm}
          hitStrokeWidth={Math.max(el.strokeMm, 2)}
          lineCap="round"
          {...shadow}
        />
      </>
    )
  return (
    <Rect
      width={el.wMm}
      height={el.hMm}
      cornerRadius={Math.min(el.radiusMm, el.wMm / 2, el.hMm / 2)}
      {...common}
    />
  )
}
