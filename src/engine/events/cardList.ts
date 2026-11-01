/**
 * A list of cards inside a piece's settings. Settings are plain text or numbers, so
 * the list is kept as text: "id" or "id*3" for several copies, joined by commas.
 */
export interface CardCount {
  id: string
  n: number
}

export function parseCardList(text: unknown): CardCount[] {
  if (typeof text !== 'string') return []
  const out: CardCount[] = []
  for (const part of text.split(',')) {
    const at = part.lastIndexOf('*')
    const id = (at < 0 ? part : part.slice(0, at)).trim()
    const n = at < 0 ? 1 : Math.floor(Number(part.slice(at + 1)))
    if (!id) continue
    const k = Number.isFinite(n) && n > 0 ? n : 1
    const same = out.find((x) => x.id === id)
    if (same) same.n += k
    else out.push({ id, n: k })
  }
  return out
}

export function formatCardList(list: CardCount[]): string {
  return list
    .filter((c) => c.id && c.n > 0)
    .map((c) => (c.n === 1 ? c.id : `${c.id}*${c.n}`))
    .join(',')
}

/** Every copy as its own entry, so a random pick weighs a card by its copies. */
export const expandCardList = (list: CardCount[]): string[] =>
  list.flatMap((c) => Array<string>(c.n).fill(c.id))
