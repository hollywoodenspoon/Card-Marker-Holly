/** Turn the Vector Maker's SVG into files: PNG, JPEG (drawn on a canvas) and vector PDF. */
import type { VectorDoc } from './model'
import { toSvg } from './svg'

export type RasterFormat = 'png' | 'jpeg'

/** Draw the artboard at `scale` (1 = one pixel per artboard pixel). */
export async function rasterize(
  doc: VectorDoc,
  format: RasterFormat,
  scale: number,
  background = '#ffffff',
): Promise<Blob> {
  const svg = toSvg(doc, format === 'jpeg' ? { background } : {})
  const w = Math.max(1, Math.round(doc.width * scale))
  const h = Math.max(1, Math.round(doc.height * scale))
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    if (format === 'jpeg') {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not make the image.'))),
        format === 'png' ? 'image/png' : 'image/jpeg',
        0.92,
      ),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** A one-page vector PDF the size of the artboard (1 px = 1 pt... at 72 dpi). */
export async function toPdf(doc: VectorDoc): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
  const pdf = new jsPDF({
    unit: 'pt',
    format: [doc.width, doc.height],
    orientation: doc.width > doc.height ? 'landscape' : 'portrait',
  })
  // svg2pdf needs the SVG in the document to resolve styles.
  const holder = document.createElement('div')
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden'
  holder.innerHTML = toSvg(doc)
  document.body.appendChild(holder)
  try {
    await svg2pdf(holder.firstElementChild as SVGElement, pdf, {
      x: 0,
      y: 0,
      width: doc.width,
      height: doc.height,
    })
  } finally {
    holder.remove()
  }
  return pdf.output('blob')
}

export const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim() || 'vector'
