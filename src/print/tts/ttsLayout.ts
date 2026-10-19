/**
 * Tabletop Simulator deck sheets. TTS custom decks are grids of up to 10 × 7
 * card images per sheet; the last slot (70) is used for the "hidden" face, so
 * each sheet holds 69 cards. Pure maths.
 */
export const TTS_COLS = 10
export const TTS_ROWS = 7
export const TTS_PER_SHEET = TTS_COLS * TTS_ROWS - 1
/** Largest sheet side TTS handles comfortably, px. */
export const TTS_MAX_PX = 4096

/** Card image size so a full 10 × 7 sheet fits in TTS_MAX_PX on both sides. */
export function ttsCardPx(cardMm: { w: number; h: number }) {
  const k = Math.min(TTS_MAX_PX / (TTS_COLS * cardMm.w), TTS_MAX_PX / (TTS_ROWS * cardMm.h))
  return {
    w: Math.floor(cardMm.w * k),
    h: Math.floor(cardMm.h * k),
    /** Resolution of the card images, dots per inch. */
    dpi: k * 25.4,
  }
}

/** Split a run of card slots into sheets of at most 69. */
export function ttsSheets<T>(slots: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < slots.length; i += TTS_PER_SHEET) out.push(slots.slice(i, i + TTS_PER_SHEET))
  return out
}

/** Top-left pixel of a slot (0-based, row-major) on a sheet. */
export const ttsSlotPos = (slot: number, px: { w: number; h: number }) => ({
  x: (slot % TTS_COLS) * px.w,
  y: Math.floor(slot / TTS_COLS) * px.h,
})
