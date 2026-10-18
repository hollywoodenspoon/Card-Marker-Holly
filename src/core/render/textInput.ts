import type { RichText, TextElement } from '../model/types'
import type { LayoutInput } from '../text/layout'

/** Layout input for a text element. Shared by the canvas and the PDF so both break lines identically. */
export function textLayoutInput(el: TextElement, text: RichText): LayoutInput {
  return {
    text,
    baseStyle: el.baseStyle,
    align: el.align,
    lineHeight: el.lineHeight,
    vAlign: el.vAlign,
    width: Math.max(0.1, el.wMm - 2 * el.paddingMm),
    height: Math.max(0.1, el.hMm - 2 * el.paddingMm),
    autoShrink: el.autoShrink,
  }
}
