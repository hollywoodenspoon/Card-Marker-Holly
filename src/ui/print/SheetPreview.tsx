import { useMemo } from 'react'
import { Group, Layer, Line, Rect, Stage } from 'react-konva'
import { assetResolver } from '@/assets/assetResolver'
import { StaticNodes } from '@/core/render/StaticCard'
import type { PrintJob } from '@/print/job'
import { backCells, cutMarks, guideLines, mirrorLine, type Line as L } from '@/print/layout'
import { useRenderVersion } from '@/ui/canvas/useRenderVersion'

/** One printed page drawn with the same card renderer as the editor. */
export function SheetPreview({
  job,
  sheetIndex,
  side,
  widthPx,
}: {
  job: PrintJob
  sheetIndex: number
  side: 'front' | 'back'
  widthPx: number
}) {
  const { sheet, settings } = job
  const version = useRenderVersion()
  const k = widthPx / sheet.pageW
  const heightPx = Math.round(sheet.pageH * k)
  const indices = job.pages[sheetIndex] ?? []
  const offset = { x: settings.backOffsetXMm, y: settings.backOffsetYMm }
  const cells = side === 'front' ? sheet.cells : backCells(sheet, settings.flip, offset)

  const lines = useMemo(() => {
    const marks = settings.cutMarks
      ? cutMarks(sheet, { lengthMm: settings.markLengthMm, offsetMm: settings.markOffsetMm })
      : []
    const guides = settings.guideLines ? guideLines(sheet) : []
    if (side === 'front') return { marks, guides }
    const m = (l: L) => mirrorLine(l, sheet, settings.flip, offset)
    return { marks: marks.map(m), guides: guides.map(m) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, settings, side])

  return (
    <Stage width={widthPx} height={heightPx} listening={false}>
      <Layer listening={false}>
        <Group scaleX={k} scaleY={k}>
          <Rect width={sheet.pageW} height={sheet.pageH} fill="#ffffff" />
          {/* printer margin, for reference */}
          <Rect
            x={sheet.marginMm}
            y={sheet.marginMm}
            width={sheet.pageW - 2 * sheet.marginMm}
            height={sheet.pageH - 2 * sheet.marginMm}
            stroke="#d9d9de"
            strokeWidth={1}
            dash={[4, 4]}
            strokeScaleEnabled={false}
          />
          {indices.map((cardIndex, slot) => {
            const c = cells[slot]
            const pc = job.cards[cardIndex]
            const nodes = side === 'front' ? pc.front : pc.back
            if (!nodes) return null
            return (
              <Group
                key={slot}
                clipX={c.cell.x}
                clipY={c.cell.y}
                clipWidth={c.cell.w}
                clipHeight={c.cell.h}
              >
                <Group x={c.trim.x} y={c.trim.y}>
                  <StaticNodes nodes={nodes} assets={assetResolver} renderVersion={version} print />
                </Group>
              </Group>
            )
          })}
          {[...lines.guides, ...lines.marks].map((l, i) => (
            <Line
              key={i}
              points={[l.x1, l.y1, l.x2, l.y2]}
              stroke="#000"
              strokeWidth={i < lines.guides.length ? 0.1 : 0.2}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  )
}
