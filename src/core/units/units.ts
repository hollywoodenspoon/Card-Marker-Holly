export const MM_PER_INCH = 25.4
export const PT_PER_INCH = 72

export const ptToMm = (pt: number) => (pt * MM_PER_INCH) / PT_PER_INCH
export const mmToPt = (mm: number) => (mm * PT_PER_INCH) / MM_PER_INCH

/** CSS reference pixel (96 per inch) — what "100%" zoom means on screen. */
export const CSS_PX_PER_MM = 96 / MM_PER_INCH

export const mmToPx = (mm: number, pxPerMm: number) => mm * pxPerMm
export const pxToMm = (px: number, pxPerMm: number) => px / pxPerMm

/** Effective print resolution of an image of `px` pixels placed across `mm`. */
export const effectiveDpi = (px: number, mm: number) =>
  mm <= 0 ? Infinity : px / (mm / MM_PER_INCH)

export const round = (v: number, step = 0.01) => Math.round(v / step) * step
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// ---------- display units ----------

/** Units lengths can be shown in. Everything is still stored in mm. */
export type LengthUnit = 'mm' | 'cm' | 'in' | 'px'

export interface UnitSettings {
  unit: LengthUnit
  /** Pixels per inch, for `px` (a pixel count only means something at a print resolution). */
  ppi: number
}

export const DEFAULT_PPI = 300
export const DEFAULT_UNITS: UnitSettings = { unit: 'mm', ppi: DEFAULT_PPI }

export const UNIT_OPTIONS: { id: LengthUnit; label: string }[] = [
  { id: 'mm', label: 'Millimetres (mm)' },
  { id: 'cm', label: 'Centimetres (cm)' },
  { id: 'in', label: 'Inches (in)' },
  { id: 'px', label: 'Pixels (px)' },
]

/** Millimetres in one display unit. */
export function mmPerUnit({ unit, ppi }: UnitSettings): number {
  switch (unit) {
    case 'mm':
      return 1
    case 'cm':
      return 10
    case 'in':
      return MM_PER_INCH
    case 'px':
      return MM_PER_INCH / (ppi > 0 ? ppi : DEFAULT_PPI)
  }
}

export const toDisplay = (mm: number, u: UnitSettings) => mm / mmPerUnit(u)
export const fromDisplay = (v: number, u: UnitSettings) => v * mmPerUnit(u)

/** Decimal places and arrow-key step that suit each unit. */
export function unitPrecision(unit: LengthUnit): { precision: number; step: number } {
  switch (unit) {
    case 'mm':
      return { precision: 2, step: 0.1 }
    case 'cm':
      return { precision: 3, step: 0.01 }
    case 'in':
      return { precision: 3, step: 0.01 }
    case 'px':
      return { precision: 0, step: 1 }
  }
}

/** A size in the chosen unit, e.g. "2.32 × 3.39 in". */
export function formatSize(wMm: number, hMm: number, u: UnitSettings) {
  const p = Math.min(2, unitPrecision(u.unit).precision)
  const f = (mm: number) => {
    const t = toDisplay(mm, u).toFixed(p)
    return t.includes('.') ? t.replace(/\.?0+$/, '') : t
  }
  return `${f(wMm)} × ${f(hMm)} ${u.unit}`
}
