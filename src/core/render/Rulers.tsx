import type Konva from 'konva'
import { Group, Line, Rect, Shape } from 'react-konva'
import { RULER } from './viewport'

/** Pick a tick step (mm) so major ticks are at least ~50 px apart. */
function steps(k: number) {
  const candidates = [1, 2, 5, 10, 20, 50, 100]
  const major = candidates.find((s) => s * k >= 50) ?? 100
  const minor = major >= 10 ? major / 10 : major / (major === 5 ? 5 : 2)
  return { major, minor: minor * k >= 4 ? minor : major }
}

interface RulerProps {
  stageW: number
  stageH: number
  panX: number
  panY: number
  k: number
  bg: string
  fg: string
  /** Start creating a guide from a ruler. */
  onGuideStart: (axis: 'x' | 'y', e: Konva.KonvaEventObject<PointerEvent>) => void
}

/** Top and left rulers in screen space. Labels are in mm, 0 at the trim corner. */
export function Rulers({ stageW, stageH, panX, panY, k, bg, fg, onGuideStart }: RulerProps) {
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
    for (let mm = startMm; mm <= endMm; mm += minor) {
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
        const label = String(Math.round(mm))
        if (axis === 'x') c.fillText(label, p + 2, 2)
        else {
          c.save()
          c.translate(2, p + 2)
          c.rotate(Math.PI / 2)
          c.fillText(label, 0, -9)
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
