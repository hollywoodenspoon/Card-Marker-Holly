import * as fontkit from 'fontkit'
import type { Font } from 'fontkit'
import type { FontAsset, TextStyle } from '@/core/model/types'
import { BUNDLED_FONT_FILES } from './bundledFontFiles'

export interface ResolvedFont {
  /** Fonts to try in order for each character (e.g. latin, then latin-ext). */
  fonts: Font[]
  /** The file lacks the style: fake it like the browser does. */
  synthBold: boolean
  synthItalic: boolean
}

const create =
  (fontkit as unknown as { default?: typeof fontkit }).default?.create ?? fontkit.create

/** Finds font binaries for text styles: uploaded fonts first, then the bundled ones. */
export class FontSources {
  private cache = new Map<string, Promise<Font | null>>()

  constructor(private uploaded: FontAsset[]) {}

  private load(key: string, get: () => Promise<ArrayBuffer>): Promise<Font | null> {
    let p = this.cache.get(key)
    if (!p) {
      p = get()
        .then((b) => create(new Uint8Array(b)))
        .catch((e) => {
          console.warn('Font could not be read for PDF', key, e)
          return null
        })
      this.cache.set(key, p)
    }
    return p
  }

  /** Font files for a style, or null when only a system font exists (no file). */
  async resolve(
    style: Pick<TextStyle, 'fontFamily' | 'bold' | 'italic'>,
  ): Promise<ResolvedFont | null> {
    const want = style.bold ? 700 : 400
    const up = this.uploaded.filter((f) => f.family === style.fontFamily)
    if (up.length) {
      const score = (f: FontAsset) =>
        Math.abs(Number(f.weight) - want) + ((f.style === 'italic') === style.italic ? 0 : 1000)
      const best = [...up].sort((a, b) => score(a) - score(b))[0]
      const font = await this.load('u:' + best.id, () => best.blob.arrayBuffer())
      if (!font) return null
      return {
        fonts: [font],
        synthBold: style.bold && Number(best.weight) < 600,
        synthItalic: style.italic && best.style !== 'italic',
      }
    }
    const files = BUNDLED_FONT_FILES.filter((f) => f.family === style.fontFamily)
    if (!files.length) return null
    const pick = (italic: boolean) => files.filter((f) => f.weight === want && f.italic === italic)
    let chosen = pick(style.italic)
    let synthItalic = false
    if (!chosen.length) {
      chosen = pick(false)
      synthItalic = style.italic
    }
    const fonts = (
      await Promise.all(
        chosen
          .sort((a) => (a.subset === 'latin' ? -1 : 1))
          .map((f) => this.load(f.url, () => fetch(f.url).then((r) => r.arrayBuffer()))),
      )
    ).filter((f): f is Font => !!f)
    return fonts.length ? { fonts, synthBold: false, synthItalic } : null
  }
}
