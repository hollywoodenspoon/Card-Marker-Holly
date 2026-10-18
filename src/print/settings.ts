import type { PrintSettings } from '@/core/model/types'

export type FullPrintSettings = Required<PrintSettings>

export const DEFAULT_PRINT: FullPrintSettings = {
  paper: 'A4',
  marginMm: 5,
  orientation: 'auto',
  cutMarks: true,
  markLengthMm: 4,
  markOffsetMm: 2,
  guideLines: false,
  includeBacks: true,
  flip: 'long',
  backOffsetXMm: 0,
  backOffsetYMm: 0,
}

/** Fill in defaults for settings saved by older versions. */
export function normalizePrint(p: PrintSettings | undefined): FullPrintSettings {
  const out = { ...DEFAULT_PRINT }
  for (const [k, v] of Object.entries(p ?? {}))
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  return out
}
