import { useMemo } from 'react'
import type { TextElement, TextValue } from '../model/types'
import { layoutText, SYMBOL_TOP_EM, type SymbolLookup, type TextLayout } from '../text/layout'
import { cssFont, sharedMeasurer } from '../text/measure'
import { textLayoutInput } from './textInput'

/** Draw at 100× and scale down so tiny mm font sizes render crisply. */
const F = 100

export function drawLayout(
  ctx: CanvasRenderingContext2D,
  layout: TextLayout,
  padding: number,
  image?: (assetId: string) => CanvasImageSource | undefined,
) {
  ctx.save()
  ctx.scale(1 / F, 1 / F)
  ctx.textBaseline = 'alphabetic'
  for (const line of layout.lines) {
    const by = (padding + layout.offsetY + line.baseline) * F
    for (const f of line.fragments) {
      if (!f.text.trim() && !f.style.underline) continue
      const size = f.sizeMm * F
      if (f.symbolAssetId) {
        const img = image?.(f.symbolAssetId)
        if (img)
          ctx.drawImage(img, (padding + f.x) * F, by - SYMBOL_TOP_EM * size, f.width * F, size)
        continue
      }
      ctx.font = cssFont(f.style, size)
      ctx.fillStyle = f.style.color
      const x0 = (padding + f.x) * F
      const ls = f.style.letterSpacingEm * size
      if (ls) {
        // Per-character drawing keeps letter spacing identical to the layout's measurement.
        let x = x0
        for (const ch of f.text) {
          ctx.fillText(ch, x, by)
          x += ctx.measureText(ch).width + ls
        }
      } else {
        ctx.fillText(f.text, x0, by)
      }
      if (f.style.underline) {
        const t = Math.max(size * 0.06, 0.5)
        ctx.fillRect(x0, by + size * 0.12, f.width * F, t)
      }
    }
  }
  ctx.restore()
}

export function useTextLayout(
  el: TextElement,
  value: TextValue,
  version: number,
  symbols?: SymbolLookup,
) {
  return useMemo(
    () => layoutText(textLayoutInput(el, value.text, symbols), sharedMeasurer()),
    // version invalidates when fonts load
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.text,
      el.baseStyle,
      el.align,
      el.lineHeight,
      el.vAlign,
      el.wMm,
      el.hMm,
      el.paddingMm,
      el.autoShrink,
      version,
    ],
  )
}
