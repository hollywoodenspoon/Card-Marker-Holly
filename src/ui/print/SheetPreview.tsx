import { useMemo } from 'react'
import { Group, Image as KImage, Layer, Line, Rect, Stage } from 'react-konva'
import { assetResolver } from '@/assets/assetResolver'
import { CornerGuide } from '@/core/render/Overlays'
import { StaticNodes } from '@/core/render/StaticCard'
import { pageSheet, type PrintJob } from '@/print/job'
import { backCells, cutMarks, guideLines, mirrorLine, type Line as L } from '@/print/layout'
import { bleedFramePath, type BleedBands } from '@/print/pdf/bleedFill'
import { useRenderVersion } from '@/ui/canvas/useRenderVersion'
import { useReadyBands } from './usePreviewBands'

/** One printed page drawn with the same card renderer as the editor. */
export function SheetPreview({
  job,
  sheetIndex,
  side,
  widthPx,
  bands,
}: {
  job: PrintJob
  sheetIndex: number
  side: 'front' | 'back'
  widthPx: number
  /** Auto-bleed bands, when the bleed is filled from the card edge. */
  bands: BleedBands | null
}) {
  const { settings } = job
  const sheet = pageSheet(job, sheetIndex)
  const version = useRenderVersion()
  const k = widthPx / sheet.pageW
  const heightPx = Math.round(sheet.pageH * k)
  const indices = useMemo(() => job.pages[sheetIndex] ?? [], [job.pages, sheetIndex])
  const offset = { x: settings.backOffsetXMm, y: settings.backOffsetYMm }
  const cells = side === 'front' ? sheet.cells : backCells(sheet, settings.flip, offset)
  const sides = useMemo(
    () => indices.map((i) => (side === 'front' ? job.cards[i].front : job.cards[i].back)),
    [indices, job.cards, side],
  )
  const ready = useReadyBands(bands, sides)
  const g = job.project.cornerGuide
  const corner = g?.enabled ? g.radiusMm : 0

  const lines = useMemo(() => {
    const marks = settings.cutMarks
      ? cutMarks(sheet, {
          lengthMm: settings.markLengthMm,
          offsetMm: settings.markOffsetMm,
          toEdge: settings.markToEdge,
        })
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
          {indices.map((_, slot) => {
            const c = cells[slot]
            const nodes = sides[slot]
            if (!nodes) return null
            const band = ready?.get(nodes)
            const at = band && bands?.placement(c.trim)
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
                {corner > 0 && (
                  <CornerGuide x={c.trim.x} y={c.trim.y} w={c.trim.w} h={c.trim.h} r={corner} />
                )}
                {band && at && (
                  <Group
                    clipFunc={(ctx) => {
                      ctx.beginPath()
                      bleedFramePath(ctx, c.cell, c.trim)
                    }}
                  >
                    <KImage image={band} x={at.x} y={at.y} width={at.w} height={at.h} />
                  </Group>
                )}
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
