/** Paper sizes in mm (portrait). Add sizes here. */
export const PAPERS = {
  A4: { w: 210, h: 297, label: 'A4' },
  A3: { w: 297, h: 420, label: 'A3' },
  A5: { w: 148, h: 210, label: 'A5' },
  Letter: { w: 215.9, h: 279.4, label: 'US Letter' },
  Legal: { w: 215.9, h: 355.6, label: 'US Legal' },
} as const

export type PaperId = keyof typeof PAPERS

export const paperOf = (id: string | undefined) => PAPERS[(id as PaperId) ?? 'A4'] ?? PAPERS.A4
