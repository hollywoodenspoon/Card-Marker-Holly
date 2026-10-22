/// <reference lib="webworker" />
/** The deck auto-builder's games, off the main thread: league games and gauntlet runs. */
import type { BotLevel } from '../bot'
import type { AsCard } from '../cards'
import { playGauntlet } from './climb'
import { playLeague, type LeagueGame } from './values'

export type DeckgenJob =
  | { kind: 'league'; id: number; cards: AsCard[]; decks: string[][]; games: LeagueGame[] }
  | {
      kind: 'gauntlet'
      id: number
      cards: AsCard[]
      deck: string[]
      gauntlet: string[][]
      seeds: number[]
      level: BotLevel
    }

self.onmessage = (e: MessageEvent<DeckgenJob>) => {
  const j = e.data
  try {
    if (j.kind === 'league')
      self.postMessage({ id: j.id, results: playLeague(j.cards, j.decks, j.games) })
    else
      self.postMessage({
        id: j.id,
        score: playGauntlet(j.cards, j.deck, j.gauntlet, j.seeds, j.level),
      })
  } catch (err) {
    self.postMessage({ id: j.id, error: err instanceof Error ? err.message : String(err) })
  }
}
