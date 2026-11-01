/**
 * How a made-up duelist looks. Nothing is stored: the face is made from the
 * duelist's id (same id, same face), with the first portrait template that has
 * pictures. A duelist linked to a character of the game uses that character instead.
 */
import { generateCharacter, type Character, type PortraitTemplate } from '../model/characters'
import type { GameDoc } from '../model/game'
import { makeRng } from '../league/rng'
import type { Duelist } from '../league/worldState'
import { usePortraitOf } from './render'

/** A stable number from text. */
export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h | 0
}

export interface Look {
  template: PortraitTemplate
  character: Character
}

export function lookOf(
  game: Pick<GameDoc, 'portraits' | 'characters'> | null,
  d: Pick<Duelist, 'id' | 'name' | 'character'> | null,
): Look | null {
  if (!game || !d) return null
  const linked = d.character ? game.characters.find((c) => c.id === d.character) : null
  const linkedT = linked?.template ? game.portraits.find((t) => t.id === linked.template) : null
  if (linked && linkedT) return { template: linkedT, character: linked }
  const template = game.portraits.find((t) => t.layers.some((l) => l.options.length))
  if (!template) return null
  return {
    template,
    character: generateCharacter(template, makeRng(hashSeed(d.id)), d.name, `duelist:${d.id}`),
  }
}

/** A duelist's portrait (null while drawing, or when the game has no portrait art). */
export function useDuelistPortrait(
  game: GameDoc | null,
  d: Pick<Duelist, 'id' | 'name' | 'character'> | null,
  expression?: string | null,
): string | null {
  const look = lookOf(game, d)
  return usePortraitOf(look?.template ?? null, look?.character ?? null, expression)
}
