import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import { croppedImageDpi, dpiFromMmPerPx, framePlacement, LOW_DPI } from '@/core/render/imageMath'
import type { RenderNode } from '@/core/render/renderTypes'
import { alignmentTargets } from '../alignmentTest'
import type { PrintJob } from '../job'
import {
  backCells,
  cutMarks,
  guideLines,
  mirrorLine,
  type Line,
  type Rect,
  type Sheet,
} from '../layout'
import type { DrawTarget } from './drawTarget'
import { JsPdfTarget } from './jsPdfTarget'
import { bleedBands, drawBand } from './bleedFill'
import { renderCard } from './renderCard'
import { createPrintResources } from './resources'

export interface ExportResult {
  blob: Blob
  pages: number
  warnings: string[]
}

const MARK_WIDTH_MM = 0.2
/** Resolution of the auto-bleed band; it is cut off, so this only needs to look right at the cut. */
const BLEED_DPI = 300
const GUIDE_WIDTH_MM = 0.1

/** svg2pdf needs the SVG in the document to resolve styles. */
async function drawSvg(svg: string, doc: jsPDF, x: number, y: number, w: number, h: number) {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden'
  host.innerHTML = svg
  document.body.appendChild(host)
  try {
    const el = host.querySelector('svg')
    if (!el) return
    // We are already in jsPDF's advanced mode. svg2pdf ends with compatAPI(), which
    // would leave it and pop a graphics state it never pushed; keep that a no-op.
    const compat = doc.compatAPI
    doc.compatAPI = (() => doc) as typeof doc.compatAPI
    try {
      await svg2pdf(el, doc, { x, y, width: w, height: h })
    } finally {
      doc.compatAPI = compat
    }
  } finally {
    host.remove()
  }
}

function newDoc(sheet: Pick<Sheet, 'orientation'>) {
  return new jsPDF({ unit: 'mm', format: 'a4', orientation: sheet.orientation, compress: true })
}

function strokeLines(t: DrawTarget, lines: Line[], width: number) {
  t.strokeColor('#000000')
  t.lineWidth(width)
  for (const l of lines) {
    t.moveTo(l.x1, l.y1)
    t.lineTo(l.x2, l.y2)
    t.stroke()
  }
}

/** Collect the leaves of a render tree. */
function leaves(nodes: RenderNode[], out: RenderNode[] = []) {
  for (const n of nodes) {
    if (n.children) leaves(n.children, out)
    else out.push(n)
  }
  return out
}

/**
 * Fronts and mirrored backs as an RGB PDF: front sheet 1, back sheet 1,
 * front sheet 2, … Pages are exactly A4 in mm.
 */
export async function exportCardsPdf(
  job: PrintJob,
  onProgress?: (done: number, total: number) => void,
): Promise<ExportResult> {
  const { sheet, settings } = job
  const warnings = new Set<string>()
  if (!sheet.perSheet) throw new Error('The card does not fit on the page with these settings.')
  const doc = newDoc(sheet)
  const res = createPrintResources(job, (family) =>
    warnings.add(
      `“${family}” has no font file, so its text is printed as a 600 dpi image. Upload the font to keep it vector.`,
    ),
  )
  const target = new JsPdfTarget(doc, drawSvg)
  const bands = bleedBands(job, BLEED_DPI / 25.4, res)
  const drawCard = async (nodes: RenderNode[], c: { cell: Rect; trim: Rect }) => {
    await renderCard(target, nodes, c.cell, c.trim, res)
    if (!bands) return
    // The band's card area sits exactly on the trim; it only shows in the bleed.
    await drawBand(target, await bands.pdfImage(nodes), c.cell, c.trim, bands.placement(c.trim))
  }
  const marks = settings.cutMarks
    ? cutMarks(sheet, {
        lengthMm: settings.markLengthMm,
        offsetMm: settings.markOffsetMm,
        toEdge: settings.markToEdge,
      })
    : []
  const guides = settings.guideLines ? guideLines(sheet) : []
  const backs = backCells(sheet, settings.flip, {
    x: settings.backOffsetXMm,
    y: settings.backOffsetYMm,
  })
  const { fronts, backs: withBacks } = job.sides
  if (!fronts && !withBacks) throw new Error('None of these cards has a back.')
  const total = job.pages.length * ((fronts ? 1 : 0) + (withBacks ? 1 : 0))
  let done = 0
  let first = true

  const page = async (draw: () => Promise<void>) => {
    if (!first) doc.addPage('a4', sheet.orientation)
    first = false
    doc.advancedAPI()
    await draw()
    doc.compatAPI()
    onProgress?.(++done, total)
  }

  for (const indices of job.pages) {
    if (fronts)
      await page(async () => {
        for (const [slot, i] of indices.entries()) {
          const c = sheet.cells[slot]
          await drawCard(job.cards[i].front, c)
          lowDpi(job, job.cards[i].front, i, warnings)
        }
        if (guides.length) strokeLines(target, guides, GUIDE_WIDTH_MM)
        if (marks.length) strokeLines(target, marks, MARK_WIDTH_MM)
      })
    if (withBacks)
      await page(async () => {
        for (const [slot, i] of indices.entries()) {
          const back = job.cards[i].back
          if (!back) continue
          const c = backs[slot]
          await drawCard(back, c)
          lowDpi(job, back, i, warnings)
        }
        const off = { x: settings.backOffsetXMm, y: settings.backOffsetYMm }
        const mirrored = (lines: Line[]) =>
          lines.map((l) => mirrorLine(l, sheet, settings.flip, off))
        if (guides.length) strokeLines(target, mirrored(guides), GUIDE_WIDTH_MM)
        if (marks.length) strokeLines(target, mirrored(marks), MARK_WIDTH_MM)
      })
  }
  const blob = doc.output('blob')
  return { blob, pages: total, warnings: [...warnings] }
}

function lowDpi(job: PrintJob, nodes: RenderNode[], cardIndex: number, out: Set<string>) {
  for (const n of leaves(nodes)) {
    const el = n.element
    let dpi: number | undefined
    if (el.type === 'image') {
      const a = job.assets[el.assetId]
      if (a && !a.isVector) dpi = croppedImageDpi(el.wMm, el.hMm, a.widthPx, a.heightPx, el.crop)
    } else if (el.type === 'imageField' && n.image?.assetId) {
      const a = job.assets[n.image.assetId]
      if (a && !a.isVector)
        dpi = dpiFromMmPerPx(framePlacement(el.wMm, el.hMm, a.widthPx, a.heightPx, n.image).mmPerPx)
    }
    if (dpi !== undefined && dpi < LOW_DPI)
      out.add(
        `${job.cards[cardIndex].card.name}: “${el.name}” prints at about ${Math.round(dpi)} DPI.`,
      )
  }
}

/**
 * Two-page test for double-sided printing: crosshairs on the front, the same
 * crosshairs mirrored on the back with fine mm rulers to read any offset.
 */
export async function exportAlignmentPdf(job: PrintJob): Promise<Blob> {
  const { sheet, settings } = job
  const doc = newDoc(sheet)
  const t = new JsPdfTarget(doc, drawSvg)
  const { front, back } = alignmentTargets(sheet, settings.marginMm, settings.flip, {
    x: settings.backOffsetXMm,
    y: settings.backOffsetYMm,
  })
  const cross = (x: number, y: number, r: number) => {
    t.strokeColor('#000000')
    t.lineWidth(0.15)
    t.moveTo(x - r, y)
    t.lineTo(x + r, y)
    t.stroke()
    t.moveTo(x, y - r)
    t.lineTo(x, y + r)
    t.stroke()
    t.moveTo(x + r * 0.6, y)
    // circle
    const k = 0.5522847498 * r * 0.6
    const rr = r * 0.6
    t.curveTo(x + rr, y + k, x + k, y + rr, x, y + rr)
    t.curveTo(x - k, y + rr, x - rr, y + k, x - rr, y)
    t.curveTo(x - rr, y - k, x - k, y - rr, x, y - rr)
    t.curveTo(x + k, y - rr, x + rr, y - k, x + rr, y)
    t.stroke()
  }
  const ruler = (x: number, y: number) => {
    // ±3 mm scales with 0.5 mm ticks, right of and below the target
    t.strokeColor('#000000')
    t.lineWidth(0.1)
    for (let i = -6; i <= 6; i++) {
      const v = i * 0.5
      const len = i % 2 === 0 ? 2 : 1
      t.moveTo(x + v, y + 9)
      t.lineTo(x + v, y + 9 + len)
      t.stroke()
      t.moveTo(x + 9, y + v)
      t.lineTo(x + 9 + len, y + v)
      t.stroke()
    }
  }
  const outlines = (cells: { trim: { x: number; y: number; w: number; h: number } }[]) => {
    t.strokeColor('#9a9aa2')
    t.lineWidth(0.1)
    for (const c of cells) {
      t.rect(c.trim.x, c.trim.y, c.trim.w, c.trim.h)
      t.stroke()
    }
  }
  const label = (text: string, x: number, y: number, size = 9) => {
    doc.setFontSize(size)
    doc.setTextColor('#000000')
    doc.text(text, x, y, { align: 'center' })
  }
  // front
  doc.advancedAPI()
  outlines(sheet.cells)
  for (const p of front) cross(p.x, p.y, 8)
  doc.compatAPI()
  for (const p of front) label(p.label, p.x, p.y - 10)
  label('Alignment test · FRONT', sheet.pageW / 2, sheet.pageH / 2 + 20, 11)
  label(
    `Print double-sided, flip on the ${settings.flip} edge. Hold the sheet to the light:`,
    sheet.pageW / 2,
    sheet.pageH / 2 + 27,
  )
  label('the crosshairs on both sides should line up.', sheet.pageW / 2, sheet.pageH / 2 + 32)
  // back
  doc.addPage('a4', sheet.orientation)
  doc.advancedAPI()
  outlines(
    backCells(sheet, settings.flip, { x: settings.backOffsetXMm, y: settings.backOffsetYMm }),
  )
  for (const p of back) {
    cross(p.x, p.y, 8)
    ruler(p.x, p.y)
  }
  doc.compatAPI()
  for (const p of back) label(p.label, p.x, p.y - 10)
  label('Alignment test · BACK', sheet.pageW / 2, sheet.pageH / 2 + 20, 11)
  label(
    'Read how far the front crosshair sits from this one on the mm scales',
    sheet.pageW / 2,
    sheet.pageH / 2 + 27,
  )
  label(
    'and enter it as back offset X / Y in the print settings.',
    sheet.pageW / 2,
    sheet.pageH / 2 + 32,
  )
  return doc.output('blob')
}
