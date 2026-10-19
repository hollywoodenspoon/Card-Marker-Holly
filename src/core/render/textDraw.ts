import { useMemo } from 'react'
import type { TextElement, TextValue } from '../model/types'
import { layoutText, SYMBOL_TOP_EM, type SymbolLookup, type TextLayout } from '../text/layout'
import { TEXT_PASSES, textEffects } from '../text/effects'
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
  ctx.lineJoin = 'round'
  // Shadows of every fragment first, then outlines, then the letters, so effects never cover text.
  for (const pass of TEXT_PASSES)
    for (const line of layout.lines) {
      const by = (padding + layout.offsetY + line.baseline) * F
      for (const f of line.fragments) {
        if (!f.text.trim() && !f.style.underline) continue
        const size = f.sizeMm * F
        const fx = textEffects(f.style, f.sizeMm)
        const x0 = (padding + f.x) * F
        if (pass === 'shadow' && !fx.shadow) continue
        if (pass === 'outline' && !fx.outline) continue
        if (f.symbolAssetId) {
          if (pass !== 'fill') continue
          const img = image?.(f.symbolAssetId)
          if (img) ctx.drawImage(img, x0, by - SYMBOL_TOP_EM * size, f.width * F, size)
          continue
        }
        ctx.save()
        ctx.font = cssFont(f.style, size)
        let dx = 0
        let dy = 0
        if (pass === 'shadow') {
          dx = fx.shadow!.dxMm * F
          dy = fx.shadow!.dyMm * F
          ctx.globalAlpha *= fx.shadow!.opacity
          ctx.fillStyle = ctx.strokeStyle = fx.shadow!.color
          ctx.lineWidth = fx.outline ? fx.outline.widthMm * 2 * F : 0
        } else if (pass === 'outline') {
          ctx.strokeStyle = fx.outline!.color
          ctx.lineWidth = fx.outline!.widthMm * 2 * F
        } else ctx.fillStyle = f.style.color
        const paint = (text: string, x: number) => {
          if (pass === 'outline') return ctx.strokeText(text, x + dx, by + dy)
          if (pass === 'shadow' && fx.outline) ctx.strokeText(text, x + dx, by + dy)
          ctx.fillText(text, x + dx, by + dy)
        }
        const ls = f.style.letterSpacingEm * size
        if (ls) {
          // Per-character drawing keeps letter spacing identical to the layout's measurement.
          let x = x0
          for (const ch of f.text) {
            paint(ch, x)
            x += ctx.measureText(ch).width + ls
          }
        } else paint(f.text, x0)
        if (f.style.underline && pass !== 'outline') {
          const t = Math.max(size * 0.06, 0.5)
          ctx.fillRect(x0 + dx, by + dy + size * 0.12, f.width * F, t)
        }
        ctx.restore()
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
