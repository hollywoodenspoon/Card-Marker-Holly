import type { FontAsset } from '@/core/model/types'
import { newId } from '@/core/model/ids'
import { sharedMeasurer } from '@/core/text/measure'
import { readFontNames, styleFromSubfamily } from './fontName'

/** Fonts shipped with the app (always available, embeddable in exports). */
export const BUNDLED_FONTS = ['Inter', 'Alegreya', 'Alegreya SC']

/** Built-in families always offered in the font picker: bundled ones, then common system fonts. */
export const BUILTIN_FONTS = [...BUNDLED_FONTS, 'Georgia', 'Arial', 'Times New Roman', 'Courier New']

const registered = new Map<string, FontFace>()
const listeners = new Set<() => void>()
let version = 0

/** Bumped whenever a font finishes loading, so text layouts can be invalidated. */
export const fontsVersion = () => version
export function onFontsChanged(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function bump() {
  sharedMeasurer().clear()
  version++
  listeners.forEach((l) => l())
}

export async function registerFont(font: FontAsset): Promise<boolean> {
  if (registered.has(font.id)) return true
  try {
    const face = new FontFace(font.family, await font.blob.arrayBuffer(), {
      weight: font.weight ?? 'normal',
      style: font.style ?? 'normal',
    })
    await face.load()
    document.fonts.add(face)
    registered.set(font.id, face)
    bump()
    return true
  } catch (e) {
    console.warn('Could not load font', font.fileName, e)
    return false
  }
}

export function unregisterFont(id: string) {
  const face = registered.get(id)
  if (face) {
    document.fonts.delete(face)
    registered.delete(id)
    bump()
  }
}

export async function registerProjectFonts(fonts: FontAsset[]) {
  await Promise.all(fonts.map(registerFont))
}

/** Wait until the bundled fonts have loaded (so the first text layout is right). */
export async function loadBuiltinFonts() {
  try {
    await Promise.all(
      BUNDLED_FONTS.flatMap((f) =>
        ['', 'bold ', 'italic ', 'italic bold '].map((v) => document.fonts.load(`${v}16px "${f}"`)),
      ),
    )
  } catch {
    /* ignore */
  }
  bump()
}

/** Derive a family name from a font file name, e.g. "Cinzel-Bold.ttf" → "Cinzel Bold". */
export function familyFromFileName(name: string): string {
  return name
    .replace(/\.(ttf|otf|woff2?)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

export const FONT_ACCEPT = '.ttf,.otf,font/ttf,font/otf'

/** Read an uploaded TTF/OTF into a FontAsset. */
export async function readFontFile(file: File, projectId: string): Promise<FontAsset> {
  const buf = await file.arrayBuffer()
  const names = readFontNames(buf)
  const { weight, style } = styleFromSubfamily(names.subfamily)
  return {
    id: newId(),
    projectId,
    family: names.family?.trim() || familyFromFileName(file.name),
    weight,
    style,
    fileName: file.name,
    blob: new Blob([buf], { type: file.type || 'font/ttf' }),
    createdAt: Date.now(),
  }
}
