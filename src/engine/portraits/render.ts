/**
 * Draws a character's portrait: each layer's picture, recoloured as its layer
 * says, stacked bottom to top on a canvas of the template's size. Results are
 * cached as object URLs by what they're drawn from, so the dialogue box and the
 * editor share them.
 */
import { useEffect, useState } from 'react'
import {
  portraitLayers,
  templateOf,
  type Character,
  type DrawnLayer,
  type PortraitTemplate,
} from '../model/characters'
import type { GameDoc } from '../model/game'
import { imageUrl } from '../scenes/images'
import { recolorPixels } from './recolor'

const cache = new Map<string, Promise<string | null>>()

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function draw(w: number, h: number, layers: DrawnLayer[]): Promise<string | null> {
  if (!layers.length) return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const out = canvas.getContext('2d')
  if (!out) return null
  for (const l of layers) {
    const url = await imageUrl(l.image)
    const img = url ? await loadImage(url) : null
    if (!img) continue
    if (l.recolor === 'none') {
      out.drawImage(img, 0, 0, w, h)
      continue
    }
    const tmp = document.createElement('canvas')
    tmp.width = w
    tmp.height = h
    const t = tmp.getContext('2d', { willReadFrequently: true })
    if (!t) continue
    t.drawImage(img, 0, 0, w, h)
    const data = t.getImageData(0, 0, w, h)
    recolorPixels(data.data, l.recolor, l.color)
    t.putImageData(data, 0, 0)
    out.drawImage(tmp, 0, 0)
  }
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  return blob ? URL.createObjectURL(blob) : null
}

export function portraitUrl(w: number, h: number, layers: DrawnLayer[]): Promise<string | null> {
  const key = JSON.stringify([w, h, layers])
  let hit = cache.get(key)
  if (!hit) {
    hit = draw(Math.max(1, w), Math.max(1, h), layers)
    cache.set(key, hit)
  }
  return hit
}

/** A character's portrait URL (null while drawing, or with no portrait). */
export function usePortrait(
  game: GameDoc | null,
  characterId: string | null | undefined,
  expression?: string | null,
): string | null {
  const c = game?.characters.find((x) => x.id === characterId) ?? null
  const t = game ? templateOf(game.portraits, c) : null
  return usePortraitOf(t, c, expression)
}

/** A portrait URL from a template and a character (the editor's previews). */
export function usePortraitOf(
  t: PortraitTemplate | null,
  c: Character | null,
  expression?: string | null,
): string | null {
  const layers = t && c ? portraitLayers(t, c, expression) : []
  const key = t ? JSON.stringify([t.width, t.height, layers]) : ''
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!t || !key) return
    let live = true
    void portraitUrl(t.width, t.height, layers).then((url) => live && setState({ key, url }))
    return () => {
      live = false
    }
    // Drawn again only when what it's drawn from changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return key && state?.key === key ? state.url : null
}
