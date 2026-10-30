import { useEffect } from 'react'
import { useHandoff } from '@/playtest/handoff'
import { randomSeed } from '@/playtest/rng'
import { presets } from '@/playtest/setup'
import { deckCards } from '@/playtest/state'
import { useDeckCards } from '../decks/useDeckCards'
import { usePack } from './packContext'
import { usePlaytest } from './usePlaytest'

const AS_SETUP = 'preset:adventure-scuffle'

/**
 * Starts the card game an Engine game asked for ("Start a card game"), once its
 * cards are open: with the rules and the bot for Adventure Scuffle! cards, or on a
 * free table for any other cards.
 */
export function useHandoffStart() {
  const pack = usePack()
  const deck = useDeckCards()
  const req = useHandoff((s) => s.req)
  useEffect(() => {
    if (!req || req.started || req.gameId !== pack.id) return
    useHandoff.setState({ req: { ...req, started: true } })
    const pt = usePlaytest.getState()
    const all = presets(pack.info.cardSize)
    const as = all.find((s) => s.id === AS_SETUP)
    if (deck.adventure && as)
      return pt.startRules(
        pack.id,
        as,
        {
          cards: deck.cards,
          decks: req.decks,
          names: req.names,
          seed: randomSeed(),
          opening: 'rps',
          reveal: 'classic',
        },
        { hotseat: !req.bot, bots: [null, req.bot] },
      )
    const list = pack.info.cards.map((c, order) => ({ ...c, order }))
    const counts = (ids: string[]) => {
      const n: Record<string, number> = {}
      for (const id of ids) n[id] = (n[id] ?? 0) + 1
      return n
    }
    pt.start(
      pack.id,
      as ?? all[0],
      req.decks.map((ids) => deckCards(list, counts(ids))),
    )
  }, [req, pack, deck])
}
