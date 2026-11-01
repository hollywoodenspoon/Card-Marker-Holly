import { useGameCards } from '../../cards/gameCards'

/** A card's name from the game's cards (its id while they load). */
export const useCardName = (id: string) =>
  useGameCards((s) => s.merged?.pack.info.cards.find((c) => c.id === id)?.name ?? id)
