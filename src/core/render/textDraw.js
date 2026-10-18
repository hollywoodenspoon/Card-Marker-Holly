import { useMemo } from 'react';
import { layoutText } from '../text/layout';
import { cssFont, sharedMeasurer } from '../text/measure';
/** Draw at 100× and scale down so tiny mm font sizes render crisply. */
const F = 100;
export function drawLayout(ctx, layout, padding) {
    ctx.save();
    ctx.scale(1 / F, 1 / F);
    ctx.textBaseline = 'alphabetic';
    for (const line of layout.lines) {
        const by = (padding + layout.offsetY + line.baseline) * F;
        for (const f of line.fragments) {
            if (!f.text.trim() && !f.style.underline)
                continue;
            const size = f.sizeMm * F;
            ctx.font = cssFont(f.style, size);
            ctx.fillStyle = f.style.color;
            const x0 = (padding + f.x) * F;
            const ls = f.style.letterSpacingEm * size;
            if (ls) {
                // Per-character drawing keeps letter spacing identical to the layout's measurement.
                let x = x0;
                for (const ch of f.text) {
                    ctx.fillText(ch, x, by);
                    x += ctx.measureText(ch).width + ls;
                }
            }
            else {
                ctx.fillText(f.text, x0, by);
            }
            if (f.style.underline) {
                const t = Math.max(size * 0.06, 0.5);
                ctx.fillRect(x0, by + size * 0.12, f.width * F, t);
            }
        }
    }
    ctx.restore();
}
export function useTextLayout(el, value, version) {
    return useMemo(() => layoutText({
        text: value.text,
        baseStyle: el.baseStyle,
        align: el.align,
        lineHeight: el.lineHeight,
        vAlign: el.vAlign,
        width: Math.max(0.1, el.wMm - 2 * el.paddingMm),
        height: Math.max(0.1, el.hMm - 2 * el.paddingMm),
        autoShrink: el.autoShrink,
    }, sharedMeasurer()), 
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
    ]);
}
