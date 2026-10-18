import type { FontAsset } from '@/core/model/types'

/** Built-in families always offered in the font picker. Inter is bundled with the app. */
export const BUILTIN_FONTS = ['Inter', 'Georgia', 'Arial', 'Times New Roman', 'Courier New']

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
  version++
  listeners.forEach((l) => l())
}

export async function registerFont(font: FontAsset): Promise<boolean> {
  if (registered.has(font.id)) return true
  try {
    const face = new FontFace(font.family, await font.blob.arrayBuffer())
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
    await Promise.all([
      document.fonts.load('16px Inter'),
      document.fonts.load('bold 16px Inter'),
      document.fonts.load('italic 16px Inter'),
      document.fonts.load('italic bold 16px Inter'),
    ])
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
