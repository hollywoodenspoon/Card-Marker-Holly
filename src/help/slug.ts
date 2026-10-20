/** Heading → anchor id, as in help:page#anchor links: "Cut marks & guides" → "cut-marks-guides". */
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
