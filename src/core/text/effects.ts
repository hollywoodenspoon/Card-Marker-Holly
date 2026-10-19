import type { TextStyle } from '../model/types'

/** Outline and shadow of a text style in mm at a given font size, or undefined when off. */
export function textEffects(style: TextStyle, sizeMm: number) {
  const outline =
    style.outlineColor && (style.outlineWidthEm ?? 0) > 0
      ? { color: style.outlineColor, widthMm: (style.outlineWidthEm ?? 0) * sizeMm }
      : undefined
  const shadow =
    style.shadowColor && (style.shadowOpacity ?? 1) > 0 && (style.shadowDxEm || style.shadowDyEm)
      ? {
          color: style.shadowColor,
          dxMm: (style.shadowDxEm ?? 0) * sizeMm,
          dyMm: (style.shadowDyEm ?? 0) * sizeMm,
          opacity: style.shadowOpacity ?? 1,
        }
      : undefined
  return { outline, shadow }
}

/** Drawing passes for a text with effects: every shadow first, then outlines, then the letters. */
export type TextPass = 'shadow' | 'outline' | 'fill'
export const TEXT_PASSES: TextPass[] = ['shadow', 'outline', 'fill']
