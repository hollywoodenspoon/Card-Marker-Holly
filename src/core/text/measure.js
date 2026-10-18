/** CSS font shorthand at a given pixel size. */
export function cssFont(style, px) {
    const fam = /[\s,'"]/.test(style.fontFamily)
        ? `"${style.fontFamily.replace(/"/g, '')}"`
        : style.fontFamily;
    return `${style.italic ? 'italic ' : ''}${style.bold ? 'bold ' : ''}${px}px ${fam}, sans-serif`;
}
const REF_PX = 100;
/** Canvas-based measurer. Measures at 100 px and scales, with a cache. */
export class CanvasMeasurer {
    ctx;
    cache = new Map();
    metricCache = new Map();
    constructor() {
        const c = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(1, 1).getContext('2d')
            : document.createElement('canvas').getContext('2d');
        if (!c)
            throw new Error('Canvas 2D unavailable');
        this.ctx = c;
    }
    /** Call when fonts load so cached widths are re-measured. */
    clear() {
        this.cache.clear();
        this.metricCache.clear();
    }
    width(text, style, sizeMm) {
        const font = cssFont(style, REF_PX);
        const key = font + '\u0000' + text;
        let w = this.cache.get(key);
        if (w === undefined) {
            this.ctx.font = font;
            w = this.ctx.measureText(text).width;
            this.cache.set(key, w);
        }
        return (w / REF_PX) * sizeMm;
    }
    metrics(style, sizeMm) {
        const font = cssFont(style, REF_PX);
        let m = this.metricCache.get(font);
        if (!m) {
            this.ctx.font = font;
            const t = this.ctx.measureText('Hg');
            const ascent = t.fontBoundingBoxAscent ?? t.actualBoundingBoxAscent ?? REF_PX * 0.8;
            const descent = t.fontBoundingBoxDescent ?? t.actualBoundingBoxDescent ?? REF_PX * 0.2;
            m = { ascent: ascent / REF_PX, descent: descent / REF_PX };
            this.metricCache.set(font, m);
        }
        return { ascent: m.ascent * sizeMm, descent: m.descent * sizeMm };
    }
}
let shared = null;
/** Shared browser measurer (created on first use). */
export function sharedMeasurer() {
    if (!shared)
        shared = new CanvasMeasurer();
    return shared;
}
