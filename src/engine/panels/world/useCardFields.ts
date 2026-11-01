import { useMemo } from 'react'
import { useGameCards } from '../../cards/gameCards'

/** The names of the card fields the game's cards have. */
export function useCardFields(): string[] {
  const cards = useGameCards((s) => s.merged?.pack.info.cards)
  return useMemo(
    () => [...new Set((cards ?? []).flatMap((c) => Object.keys(c.fields)))].sort(),
    [cards],
  )
}
