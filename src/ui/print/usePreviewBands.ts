import { useEffect, useState } from 'react'
import type { RenderNode } from '@/core/render/renderTypes'
import type { PrintJob } from '@/print/job'
import type { BleedBands } from '@/print/pdf/bleedFill'

/** Preview resolution for auto-bleed bands (the PDF uses 300 dpi). */
const PREVIEW_PX_PER_MM = 150 / 25.4

/**
 * Auto-bleed bands for the print preview, drawn by the same code as the PDF.
 * The renderer loads on demand; null while loading or when the bleed is drawn
 * as designed.
 */
export function usePreviewBands(job: PrintJob): BleedBands | null {
  const [bands, setBands] = useState<BleedBands | null>(null)
  const { bleedFill } = job.settings
  const { bleedMm, defaultSize } = job.project
  const fontKey = job.fonts.map((f) => f.id).join()
  useEffect(() => {
    let live = true
    void Promise.all([import('@/print/pdf/bleedFill'), import('@/print/pdf/resources')]).then(
      ([{ bleedBands }, { createPrintResources }]) => {
        if (live) setBands(bleedBands(job, PREVIEW_PX_PER_MM, createPrintResources(job)))
      },
    )
    return () => {
      live = false
    }
    // Rebuild only when something that changes the bands changes, not on every job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bleedFill, bleedMm, defaultSize.widthMm, defaultSize.heightMm, job.assets, fontKey])
  return bands
}

/** The bands that are ready for these card sides; re-renders as each one finishes. */
export function useReadyBands(bands: BleedBands | null, sides: (RenderNode[] | null)[]) {
  const [ready, setReady] = useState(() => new Map<RenderNode[], HTMLCanvasElement>())
  const [owner, setOwner] = useState(bands)
  if (owner !== bands) {
    setOwner(bands)
    setReady(new Map())
  }
  useEffect(() => {
    if (!bands) return
    let live = true
    for (const nodes of new Set(sides)) {
      if (!nodes) continue
      void bands.canvas(nodes).then((c) => {
        if (live) setReady((m) => (m.get(nodes) === c ? m : new Map(m).set(nodes, c)))
      })
    }
    return () => {
      live = false
    }
  }, [bands, sides])
  return bands ? ready : null
}
