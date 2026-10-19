import { Group, Line, Rect, Shape } from 'react-konva'

const BLEED_SHADE = 'rgba(120,120,128,0.55)'

/** Bleed shading, trim line, safe-area line. Drawn above content, never interactive. */
export function TrimOverlay({
  w,
  h,
  bleed,
  safe,
}: {
  w: number
  h: number
  bleed: number
  safe: number
}) {
  const b = bleed
  return (
    <Group listening={false}>
      {b > 0 && (
        <>
          <Rect x={-b} y={-b} width={w + 2 * b} height={b} fill={BLEED_SHADE} />
          <Rect x={-b} y={h} width={w + 2 * b} height={b} fill={BLEED_SHADE} />
          <Rect x={-b} y={0} width={b} height={h} fill={BLEED_SHADE} />
          <Rect x={w} y={0} width={b} height={h} fill={BLEED_SHADE} />
          <Rect
            x={-b}
            y={-b}
            width={w + 2 * b}
            height={h + 2 * b}
            stroke="#e5484d"
            strokeWidth={1}
            dash={[4, 3]}
            strokeScaleEnabled={false}
          />
        </>
      )}
      <Rect width={w} height={h} stroke="#111" strokeWidth={1} strokeScaleEnabled={false} />
      {safe > 0 && safe * 2 < Math.min(w, h) && (
        <Rect
          x={safe}
          y={safe}
          width={w - 2 * safe}
          height={h - 2 * safe}
          stroke="#2f9e44"
          strokeWidth={1}
          dash={[3, 3]}
          strokeScaleEnabled={false}
        />
      )}
    </Group>
  )
}

/** Snap feedback lines in mm, spanning well beyond the card. */
export function SnapLines({ xs, ys, w, h }: { xs: number[]; ys: number[]; w: number; h: number }) {
  const pad = Math.max(w, h)
  return (
    <Group listening={false}>
      {xs.map((x) => (
        <Line
          key={`x${x}`}
          points={[x, -pad, x, h + pad]}
          stroke="#ff2d87"
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
      ))}
      {ys.map((y) => (
        <Line
          key={`y${y}`}
          points={[-pad, y, w + pad, y]}
          stroke="#ff2d87"
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
      ))}
    </Group>
  )
}

const CORNER_SHADE = 'rgba(255,140,0,0.35)'

/**
 * Corner-rounding guide: the parts a corner cutter of radius `r` removes are
 * shaded, with a dashed rounded outline. Never printed.
 */
export function CornerGuide({
  w,
  h,
  r,
  x = 0,
  y = 0,
}: {
  w: number
  h: number
  r: number
  x?: number
  y?: number
}) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  if (rr <= 0) return null
  return (
    <Group x={x} y={y} listening={false}>
      <Shape
        fill={CORNER_SHADE}
        sceneFunc={(ctx, shape) => {
          const P = Math.PI
          ctx.beginPath()
          // each corner: the square minus its quarter circle (y points down)
          ctx.moveTo(0, 0)
          ctx.lineTo(rr, 0)
          ctx.arc(rr, rr, rr, -P / 2, P, true)
          ctx.closePath()
          ctx.moveTo(w, 0)
          ctx.lineTo(w - rr, 0)
          ctx.arc(w - rr, rr, rr, -P / 2, 0, false)
          ctx.closePath()
          ctx.moveTo(0, h)
          ctx.lineTo(rr, h)
          ctx.arc(rr, h - rr, rr, P / 2, P, false)
          ctx.closePath()
          ctx.moveTo(w, h)
          ctx.lineTo(w - rr, h)
          ctx.arc(w - rr, h - rr, rr, P / 2, 0, true)
          ctx.closePath()
          ctx.fillShape(shape)
        }}
      />
      <Rect
        width={w}
        height={h}
        cornerRadius={rr}
        stroke="#e8590c"
        strokeWidth={1}
        dash={[3, 2]}
        strokeScaleEnabled={false}
      />
    </Group>
  )
}
