import { readFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { beforeAll, describe, expect, it } from 'vitest'
import { RICH_BLACK } from '../color/cmyk'
import { loadColorEngine, type ColorEngine } from '../color/engine'
import { addCmykImage, addOutputIntent, alphaOf } from './cmykPdf'
import { CmykTarget, svgNeedsRaster } from './cmykTarget'
import { JsPdfTarget } from './jsPdfTarget'

let engine: ColorEngine
beforeAll(async () => {
  const icc = readFileSync(new URL('../color/profiles/ISOcoated_v2_eci.icc', import.meta.url))
  engine = await loadColorEngine(new Uint8Array(icc))
})

function page(draw: (t: CmykTarget, doc: jsPDF) => void, swatches = {}) {
  const doc = new jsPDF({ unit: 'mm', format: [100, 100], compress: false })
  const warnings: string[] = []
  const pdf = new JsPdfTarget(doc, async () => {})
  const t = new CmykTarget(pdf, { engine, swatches, warn: (m) => warnings.push(m) })
  doc.advancedAPI()
  draw(t, doc)
  doc.compatAPI()
  return { text: doc.output(), warnings }
}

/** The colour operators of a page (fill k, stroke K, and any RGB or grey ones). */
const ops = (pdf: string) => ({
  fills: [...pdf.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) k\n/g)].map((m) =>
    m.slice(1, 5).map(Number),
  ),
  strokes: [...pdf.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) K\n/g)].map((m) =>
    m.slice(1, 5).map(Number),
  ),
  rgb: [...pdf.matchAll(/[\d.]+ [\d.]+ [\d.]+ (rg|RG)\n/g)].length,
})

describe('CMYK PDF output', () => {
  it('writes every colour as CMYK, none as RGB', () => {
    const { text } = page((t) => {
      t.fillColor('#e03a2f')
      t.rect(10, 10, 20, 20)
      t.fill()
      t.strokeColor('#3060c0')
      t.lineWidth(0.5)
      t.moveTo(0, 0)
      t.lineTo(50, 50)
      t.stroke()
    })
    const o = ops(text)
    expect(o.rgb).toBe(0)
    expect(o.fills).toHaveLength(1)
    const red = engine.cmyk('#e03a2f')
    o.fills[0].forEach((v, i) => expect(v).toBeCloseTo(red[i], 2))
    expect(o.strokes).toHaveLength(1)
  })

  it('prints small black as plain K and big black areas as rich black', () => {
    const { text } = page((t) => {
      t.fillColor('#000000')
      t.rect(5, 5, 4, 30) // a thin bar: plain black
      t.fill()
      t.rect(20, 20, 30, 30) // a big panel: rich black
      t.fill()
      t.save()
      t.transform([0.2, 0, 0, 0.2, 0, 0]) // drawn at 30 mm but scaled to 6 mm: plain
      t.rect(60, 60, 30, 30)
      t.fill()
      t.restore()
    })
    expect(ops(text).fills).toEqual([[0, 0, 0, 1], RICH_BLACK, [0, 0, 0, 1]])
  })

  it('keeps the colour out of the path (PDF allows no colour change inside one)', () => {
    const { text } = page((t) => {
      t.moveTo(0, 0)
      t.fillColor('#00ff00') // set after the path started
      t.lineTo(10, 0)
      t.lineTo(10, 10)
      t.closePath()
      t.fill()
    })
    const body = text.slice(text.indexOf('stream'))
    expect(body).toMatch(/ k\n[\d. ]+ m\n[\d. ]+ l\n[\d. ]+ l\nh\nf\n/)
  })

  it('uses exact CMYK swatches, held to the ink limit', () => {
    const { text, warnings } = page(
      (t) => {
        t.fillColor('#E03A2F')
        t.rect(0, 0, 5, 5)
        t.fill()
        t.fillColor('#112233')
        t.rect(0, 0, 5, 5)
        t.fill()
      },
      { '#e03a2f': [0, 0.8, 0.9, 0], '#112233': [1, 1, 1, 1] },
    )
    const [exact, heavy] = ops(text).fills
    expect(exact).toEqual([0, 0.8, 0.9, 0])
    const total = (heavy[0] + heavy[1] + heavy[2] + heavy[3]) * 100
    expect(Math.abs(total - engine.inkLimit)).toBeLessThan(1.5)
    expect(heavy[3]).toBe(1)
    expect(warnings[0]).toMatch(/ink limit/)
  })

  it('embeds CMYK images with transparency, and the output intent', () => {
    const doc = new jsPDF({ unit: 'mm', format: [50, 50], compress: false })
    addOutputIntent(doc, engine.profile, 'FOGRA39', 'FOGRA39 (ISO Coated v2, ECI)')
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 0])
    const img = { width: 2, height: 1, cmyk: engine.pixels(rgba), alpha: alphaOf(rgba) }
    addCmykImage(doc, img, 'two', 0, 0, 10, 5)
    addCmykImage(doc, img, 'two', 20, 0, 10, 5) // the same alias embeds it once
    const pdf = doc.output()
    expect(pdf.match(/\/ColorSpace \/DeviceCMYK/g)).toHaveLength(1)
    expect(pdf).toMatch(/\/SMask \d+ 0 R/)
    expect(pdf).toMatch(/\/Decode \[1 0 1 0 1 0 1 0\]/)
    expect(pdf).toMatch(
      /\/OutputIntents \[<< \/Type \/OutputIntent \/S \/GTS_PDFX \/OutputConditionIdentifier \(FOGRA39\)/,
    )
    expect(pdf).toMatch(/\/N 4/)
    expect(alphaOf(new Uint8ClampedArray([1, 2, 3, 255]))).toBeUndefined()
  })

  it('keeps flat SVGs vector and sends gradients and photos through a raster', () => {
    expect(svgNeedsRaster('<svg><path fill="#f00" d="M0 0h1v1z"/></svg>')).toBe(false)
    expect(svgNeedsRaster('<svg><defs><linearGradient id="g"/></defs></svg>')).toBe(true)
    expect(svgNeedsRaster('<svg><image href="a.png"/></svg>')).toBe(true)
  })
})
