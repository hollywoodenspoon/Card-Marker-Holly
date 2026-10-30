/**
 * Test draws: shuffle a deck with a seed and draw from the top. The same deck and
 * seed always give the same cards (the game's seeded random numbers, shared with
 * Play's table).
 */
import { shuffle } from '@/playtest/rng'
import { deckList } from '../model/game'

export interface DrawState {
  /** Cards left, top first. */
  pile: string[]
  hand: string[]
  seed: number
}

export function shuffled(deck: { counts: Record<string, number> }, seed: number): DrawState {
  const [pile, next] = shuffle(deckList(deck), seed)
  return { pile, hand: [], seed: next }
}

export function draw(s: DrawState, n: number): DrawState {
  const take = s.pile.slice(0, n)
  return { ...s, pile: s.pile.slice(take.length), hand: [...s.hand, ...take] }
}
