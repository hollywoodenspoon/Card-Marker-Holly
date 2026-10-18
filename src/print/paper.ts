/** Paper sizes in mm (portrait). Only A4 is offered for now; add sizes here. */
export const PAPERS = {
  A4: { w: 210, h: 297 },
} as const

export type PaperId = keyof typeof PAPERS
