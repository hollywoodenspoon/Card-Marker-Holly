export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;
export const ptToMm = (pt) => (pt * MM_PER_INCH) / PT_PER_INCH;
export const mmToPt = (mm) => (mm * PT_PER_INCH) / MM_PER_INCH;
/** CSS reference pixel (96 per inch) — what "100%" zoom means on screen. */
export const CSS_PX_PER_MM = 96 / MM_PER_INCH;
export const mmToPx = (mm, pxPerMm) => mm * pxPerMm;
export const pxToMm = (px, pxPerMm) => px / pxPerMm;
/** Effective print resolution of an image of `px` pixels placed across `mm`. */
export const effectiveDpi = (px, mm) => mm <= 0 ? Infinity : px / (mm / MM_PER_INCH);
export const round = (v, step = 0.01) => Math.round(v / step) * step;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
