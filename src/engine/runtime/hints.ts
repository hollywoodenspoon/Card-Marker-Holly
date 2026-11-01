/**
 * Tutorial hints: a piece shows a hint on a screen of its own. A hint can be shown
 * only the first time (remembered in the save), and the game's tutorial switch
 * turns every hint off.
 */
import type { RunContext } from '../events/pieces'
import { textOf } from './runtime'
import { get, set, showScreen } from './state'

export async function showHint(
  ctx: RunContext,
  o: { text: string; once: boolean; name: string },
): Promise<void> {
  const game = get().game
  const w = get().world
  if (!game || !game.settings.tutorial || ctx.stopped() || !o.text.trim()) return
  const id = o.name.trim() || o.text.trim()
  if (o.once && w?.seenHints.includes(id)) return
  if (o.once && w) set({ world: { ...w, seenHints: [...w.seenHints, id] } })
  await showScreen({ kind: 'hint', text: textOf(o.text) })
}
