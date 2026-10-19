import { sharedMeasurer } from '@/core/text/measure'
import type { PrintJob } from '../job'
import { FontSources } from './fontSources'
import { PdfImages } from './pdfImages'
import type { PrintResources } from './renderCard'
import { makeTextDrawer } from './textOutlines'

/** Images, fonts and symbols for drawing the cards of a print job. */
export function createPrintResources(
  job: Pick<PrintJob, 'assets' | 'fonts'>,
  onFontFallback: (family: string) => void = () => {},
): PrintResources {
  const images = new PdfImages(job.assets)
  const fonts = new FontSources(job.fonts)
  const measurer = sharedMeasurer()
  return {
    measurer,
    image: (id) => images.get(id),
    info: (id) => {
      const a = job.assets[id]
      return a ? { widthPx: a.widthPx, heightPx: a.heightPx, isVector: a.isVector } : undefined
    },
    symbols: (name) => {
      const n = name.toLowerCase()
      const a = Object.values(job.assets).find((x) => x.tags.some((t) => t.toLowerCase() === n))
      return a ? { assetId: a.id, aspect: a.heightPx ? a.widthPx / a.heightPx : 1 } : undefined
    },
    text: makeTextDrawer(fonts, measurer, onFontFallback),
  }
}
