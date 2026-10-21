import { createContext, useContext } from 'react'
import type { GamePack, PackInfo } from '@/playtest/pack'

export interface Face {
  /** Object URLs of the card's pictures (back null: the card has no back). */
  front: string | null
  back: string | null
  /** Card size in mm. */
  w: number
  h: number
}

/** A pack opened for playing: its info and a picture URL per card. */
export interface OpenPack {
  id: string
  info: PackInfo
  faces: Record<string, Face>
  /** Frees the picture URLs. */
  close: () => void
}

/** Turn a pack's pictures into object URLs (one per picture, shared by cards with the same back). */
export function openPack(id: string, pack: GamePack): OpenPack {
  const urls: Record<string, string> = {}
  const url = (path: string | null) => {
    if (!path) return null
    return (urls[path] ??= URL.createObjectURL(
      new Blob([pack.images[path] as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
    ))
  }
  const faces: Record<string, Face> = {}
  for (const c of pack.info.cards)
    faces[c.id] = { front: url(c.front), back: url(c.back), w: c.w, h: c.h }
  return {
    id,
    info: pack.info,
    faces,
    close: () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)),
  }
}

const PackContext = createContext<OpenPack | null>(null)
export const PackProvider = PackContext.Provider
export const usePack = () => useContext(PackContext)!
export const useFaces = () => usePack().faces
