/** The game's cards as the league sees them (name, Ace or not, fields). */
import { useGameCards } from '../cards/gameCards'
import type { LCard } from '../league/cards'
import { isAce } from '../model/economy'
import type { GameDoc } from '../model/game'

export function leagueCards(game: GameDoc): LCard[] {
  const cards = useGameCards.getState().merged?.pack.info.cards ?? []
  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    ace: isAce(c.fields, game.economy),
    fields: c.fields,
  }))
}
