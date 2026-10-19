import type Konva from 'konva'
import { Group, Line, Rect, Shape } from 'react-konva'
import { RULER } from './viewport'

/**
 * Tick steps in display units (k = screen px per unit) so major ticks are at
 * least ~50 px apart: 1, 2 or 5 times a power of ten.
 */
function steps(k: number) {
  let major = 10000
  let digit = 1
  find: for (let e = -3; e <= 4; e++)
    for (const n of [1, 2, 5]) {
      if (n * 10 ** e * k >= 50) {
        major = n * 10 ** e
        digit = n
        break find
      }
    }
  const minor = major / (digit === 1 ? 10 : digit)
  return { major, minor: minor * k >= 4 ? minor : major }
}

const label = (v: number) => String(Math.round(v * 1000) / 1000)

interface RulerProps {
  stageW: number
  stageH: number
  panX: number
  panY: number
  k: number
  bg: string
  fg: string
  /** Millimetres per display unit (1 for mm; labels and ticks follow the unit). */
  mmPerUnit?: number
  /** Start creating a guide from a ruler. */
  onGuideStart: (axis: 'x' | 'y', e: Konva.KonvaEventObject<PointerEvent>) => void
}

/** Top and left rulers in screen space. Labels are in the display unit, 0 at the trim corner. */
export function Rulers({
  stageW,
  stageH,
  panX,
  panY,
  k: kMm,
  bg,
  fg,
  mmPerUnit = 1,
  onGuideStart,
}: RulerProps) {
  // Work in display units: screen px per unit.
  const k = kMm * mmPerUnit
  const { major, minor } = steps(k)
  const draw = (axis: 'x' | 'y') => (ctx: Konva.Context) => {
    const c = ctx._context
    c.save()
    c.fillStyle = fg
    c.strokeStyle = fg
    c.lineWidth = 1
    c.font = '10px Inter, system-ui, sans-serif'
    c.textBaseline = 'top'
    const len = axis === 'x' ? stageW : stageH
    const origin = axis === 'x' ? panX : panY
    const startMm = Math.floor((RULER - origin) / k / minor) * minor
    const endMm = (len - origin) / k
    c.beginPath()
    const n0 = Math.round(startMm / minor)
    for (let i = n0; i * minor <= endMm; i++) {
      const mm = i * minor
      const p = Math.round(origin + mm * k) + 0.5
      if (p < RULER) continue
      const isMajor = Math.abs(mm / major - Math.round(mm / major)) < 1e-6
      const t = isMajor ? 9 : 4
      if (axis === 'x') {
        c.moveTo(p, RULER)
        c.lineTo(p, RULER - t)
      } else {
        c.moveTo(RULER, p)
        c.lineTo(RULER - t, p)
      }
      if (isMajor) {
        const text = label(mm)
        if (axis === 'x') c.fillText(text, p + 2, 2)
        else {
          c.save()
          c.translate(2, p + 2)
          c.rotate(Math.PI / 2)
          c.fillText(text, 0, -9)
          c.restore()
        }
      }
    }
    c.stroke()
    c.restore()
  }
  return (
    <Group>
      <Rect
        x={RULER}
        y={0}
        width={stageW}
        height={RULER}
        fill={bg}
        onPointerDown={(e) => onGuideStart('y', e)}
      />
      <Rect
        x={0}
        y={RULER}
        width={RULER}
        height={stageH}
        fill={bg}
        onPointerDown={(e) => onGuideStart('x', e)}
      />
      <Shape sceneFunc={draw('x')} listening={false} />
      <Shape sceneFunc={draw('y')} listening={false} />
      <Rect width={RULER} height={RULER} fill={bg} />
      <Line points={[RULER, RULER, stageW, RULER]} stroke={fg} strokeWidth={0.5} opacity={0.4} />
      <Line points={[RULER, RULER, RULER, stageH]} stroke={fg} strokeWidth={0.5} opacity={0.4} />
    </Group>
  )
}
