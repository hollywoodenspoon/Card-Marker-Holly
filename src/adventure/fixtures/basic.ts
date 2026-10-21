import type { AsCard } from '../cards'

/**
 * Plain test cards with stats only: c1…c24, Fate Numbers 100 + 20 × n so the
 * ranking is easy to follow. Low Fate cards hit harder, high ones defend
 * better, like the real set.
 */
export function basicCards(n = 24): AsCard[] {
  return Array.from({ length: n }, (_, k) => {
    const i = k + 1
    return {
      id: `c${i}`,
      code: `T-${i}`,
      name: `Card ${i}`,
      ace: false,
      type: 'Field',
      fs: (i % 3) + 1,
      a: 4 - Math.floor((k % 12) / 4),
      d: 2 + Math.floor((k % 12) / 4),
      fate: 100 + 20 * i,
      ability: '',
      group: '',
    }
  })
}

/** Two Free Companies: c1…c12 and c13…c24. */
export const basicDecks = (): [string[], string[]] => [
  Array.from({ length: 12 }, (_, k) => `c${k + 1}`),
  Array.from({ length: 12 }, (_, k) => `c${k + 13}`),
]
