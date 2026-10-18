import { Group, Line, Rect } from 'react-konva'

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
