import { useMemo } from 'react'
import { cardsFromPack, isAdventurePack, type AsCard } from '@/adventure/cards'
import type { PackCard } from '@/playtest/pack'
import { usePack } from '../table/packContext'

/** Cards as the deck builder shows them; plain packs get names only and no Ace rule. */
export function useDeckCards() {
  const { info } = usePack()
  return useMemo(() => {
    if (isAdventurePack(info.cards)) return { adventure: true, ...cardsFromPack(info.cards) }
    const cards = info.cards.map((c: PackCard): AsCard => ({
      id: c.id,
      code: c.id,
      name: c.name,
      ace: false,
      type: null,
      fs: 0,
      a: 0,
      d: 0,
      fate: 0,
      ability: '',
      group: '',
      archetypes: [],
    }))
    return { adventure: false, cards, issues: [] }
  }, [info.cards])
}
