import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import type { Id } from '@/core/model/types'
import { renderCardImage } from '@/print/image/exportImages'
import { resolveCard } from '@/print/job'
import { createPrintResources } from '@/print/pdf/resources'
import { cardContext } from '@/templates/cardContext'

/** Sharp enough to read when zoomed in, small enough for dozens of cards. */
const DPI = 200

export interface Face {
  /** Object URLs (null: no back template, or not drawn yet). */
  front: string | null
  back: string | null
  /** Card size in mm. */
  w: number
  h: number
}

/**
 * The card images for a game, drawn once with the PDF renderer (the same
 * pixels as the printed card) and freed when the view closes. Cards appear
 * as they finish.
 */
export function useCardFaces(cardIds: Id[]): Record<Id, Face> {
  const [faces, setFaces] = useState<Record<Id, Face>>({})
  const urls = useRef<string[]>([])
  const done = useRef(new Set<Id>())
  const key = [...new Set(cardIds)].sort().join(',')

  useEffect(() => {
    let cancelled = false
    const { doc, library } = useEditor.getState()
    if (!doc) return
    const todo = key ? key.split(',').filter((id) => !done.current.has(id)) : []
    if (!todo.length) return
    const res = createPrintResources({
      assets: library.assets,
      fonts: Object.values(library.fonts),
    })
    const def = doc.project.defaultSize
    const toUrl = async (c: HTMLCanvasElement) => {
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.9))
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      urls.current.push(url)
      return url
    }
    void (async () => {
      for (const id of todo) {
        if (cancelled) return
        const card = doc.cards[id]
        if (!card) continue
        const ft = card.frontTemplateId ? doc.templates[card.frontTemplateId] : undefined
        const bt = card.backTemplateId ? doc.templates[card.backTemplateId] : undefined
        const size = ft?.size ?? def
        const w = size.widthMm
        const h = size.heightMm
        const sides = resolveCard(
          card,
          ft,
          bt,
          doc.stylePresets,
          cardContext(doc.project, doc.cards, id),
        )
        const opts = { card: { w, h }, bleedMm: 0, withBleed: false, dpi: DPI, opaque: true }
        try {
          const front = await toUrl(await renderCardImage(sides.front, opts, res, null))
          const back = sides.back
            ? await toUrl(await renderCardImage(sides.back, opts, res, null))
            : null
          if (cancelled) return
          done.current.add(id)
          setFaces((f) => ({ ...f, [id]: { front, back, w, h } }))
        } catch {
          // A card that can't be drawn shows its name instead.
          if (cancelled) return
          done.current.add(id)
          setFaces((f) => ({ ...f, [id]: { front: null, back: null, w, h } }))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [key])

  useEffect(() => {
    const list = urls.current
    return () => list.forEach((u) => URL.revokeObjectURL(u))
  }, [])
  return faces
}

const FacesContext = createContext<Record<Id, Face>>({})
export const FacesProvider = FacesContext.Provider
export const useFaces = () => useContext(FacesContext)
