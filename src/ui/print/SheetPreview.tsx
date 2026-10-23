import type Konva from 'konva'
import { useEffect, useMemo, useRef } from 'react'
import { Group, Image as KImage, Layer, Line, Rect, Stage } from 'react-konva'
import { assetResolver } from '@/assets/assetResolver'
import { CornerGuide } from '@/core/render/Overlays'
import { StaticNodes } from '@/core/render/StaticCard'
import { pageSheet, type PrintJob } from '@/print/job'
import { backCells, mirrorLine, sheetLines, type Line as L } from '@/print/layout'
import type { ColorEngine } from '@/print/color/engine'
import { outOfRange } from '@/print/color/gamut'
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
  proof,
  markOut = false,
  onOutOfRange,
}: {
  job: PrintJob
  sheetIndex: number
  side: 'front' | 'back'
  widthPx: number
  /** Auto-bleed bands, when the bleed is filled from the card edge. */
  bands: BleedBands | null
  /** CMYK preview: show the sheet as it will print with this profile. */
  proof?: ColorEngine | null
  /** Paint the colours that will print noticeably duller in magenta. */
  markOut?: boolean
  /** The share of coloured pixels that will print noticeably duller. */
  onOutOfRange?: (share: number) => void
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
    const { marks, guides } = sheetLines(sheet, settings)
    if (side === 'front') return { marks, guides }
    const m = (l: L) => mirrorLine(l, sheet, settings.flip, offset)
    return { marks: marks.map(m), guides: guides.map(m) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, settings, side])

  const layer = useRef<Konva.Layer>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const report = useRef(onOutOfRange)
  useEffect(() => {
    report.current = onOutOfRange
  })
  useSoftProof(layer, overlay, proof, markOut, report)

  return (
    <div className="relative" style={{ width: widthPx, height: heightPx }}>
      <Stage width={widthPx} height={heightPx} listening={false}>
        <Layer listening={false} ref={layer}>
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
                    <StaticNodes
                      nodes={nodes}
                      assets={assetResolver}
                      renderVersion={version}
                      print
                    />
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
      {proof && (
        <canvas
          ref={overlay}
          className="pointer-events-none absolute inset-0"
          style={{ width: widthPx, height: heightPx }}
          data-testid="print-proof"
          aria-hidden
        />
      )}
    </div>
  )
}

/**
 * The CMYK preview: after each redraw of the sheet, its pixels go through the
 * printer profile and back, and the result is painted over the sheet.
 */
function useSoftProof(
  layer: React.RefObject<Konva.Layer | null>,
  overlay: React.RefObject<HTMLCanvasElement | null>,
  proof: ColorEngine | null | undefined,
  markOut: boolean,
  report: React.RefObject<((share: number) => void) | undefined>,
) {
  useEffect(() => {
    const L = layer.current
    if (!proof || !L) return
    let timer = 0
    const run = () => {
      const src = L.getNativeCanvasElement()
      const out = overlay.current
      const w = src.width
      const h = src.height
      if (!out || !w || !h) return
      const pixels = src.getContext('2d')!.getImageData(0, 0, w, h)
      const shown = proof.proof(pixels.data)
      report.current?.(outOfRange(pixels.data, shown, markOut))
      out.width = w
      out.height = h
      out
        .getContext('2d')!
        .putImageData(new ImageData(shown as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0)
    }
    // Wait for the sheet to settle (pictures load and redraw it).
    const schedule = () => {
      clearTimeout(timer)
      timer = window.setTimeout(run, 150)
    }
    L.on('draw.proof', schedule)
    schedule()
    return () => {
      clearTimeout(timer)
      L.off('draw.proof')
    }
  }, [layer, overlay, proof, markOut, report])
}
