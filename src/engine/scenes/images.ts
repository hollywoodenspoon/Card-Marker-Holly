/**
 * Picture URLs for scenes: a game's own images (the Engine's assets table) and the
 * images of its live card projects (loaded with the cards). One object URL per
 * image, shared by every scene and kept for the session.
 */
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useGameCards } from '../cards/gameCards'
import type { ImageRef } from '../model/game'
import { assets } from '../storage/assets'

const urls = new Map<string, string>()
const keyOf = (r: ImageRef) => `${r.store}:${r.id}`

/** Bumped when a game image is added or removed, so lists refresh. */
export const useImageVersion = create<{ v: number }>(() => ({ v: 0 }))
export const imagesChanged = () => useImageVersion.setState((s) => ({ v: s.v + 1 }))

export async function imageUrl(r: ImageRef): Promise<string | null> {
  const k = keyOf(r)
  const hit = urls.get(k)
  if (hit) return hit
  const blob =
    r.store === 'cards' ? useGameCards.getState().cardImages[r.id]?.blob : await assets.get(r.id)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urls.set(k, url)
  return url
}

export function useImageUrl(r: ImageRef | null | undefined): string | null {
  const cardsReady = useGameCards((s) => s.cardImages)
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null)
  const key = r ? keyOf(r) : ''
  useEffect(() => {
    if (!r) return
    let live = true
    void imageUrl(r).then((url) => live && setState({ key: keyOf(r), url }))
    return () => {
      live = false
    }
    // r is identified by its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cardsReady])
  return r && state?.key === key ? state.url : null
}
