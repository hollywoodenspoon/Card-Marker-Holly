/**
 * The game's wording for the player screens: the text list's defaults with the
 * running game's own overrides, and {placeholders} filled in.
 */
import { fillLine, textFor } from '../model/gameText'
import { get, useRuntime } from './state'

type Vars = Record<string, string | number>

/** One line of the running game's text list (outside React). */
export const line = (key: string, vars?: Vars): string =>
  fillLine(textFor(get().game?.text, key), vars)

/** The same inside a component; it re-renders when the game's text changes. */
export function useLine(): (key: string, vars?: Vars) => string {
  const text = useRuntime((s) => s.game?.text)
  return (key, vars) => fillLine(textFor(text, key), vars)
}
