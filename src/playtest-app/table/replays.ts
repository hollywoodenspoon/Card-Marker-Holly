import { saveReplay } from '@/playtest/library'
import { usePlaytest } from './usePlaytest'

/**
 * Keep the open rules game as a replay (on its win, or when it's left after
 * the first round). A game resumed from before replays existed has no record
 * of its start, so it can't be kept.
 */
export async function keepReplay(): Promise<boolean> {
  const { packId, rules, game, moves, bots, replay } = usePlaytest.getState()
  if (!packId || !rules || !game || replay) return false
  await saveReplay({
    // The same game again (after an undo, say) replaces its replay.
    id: `play-${game.seed}`,
    packId,
    source: bots.some(Boolean) ? 'bot' : 'play',
    names: [rules.players[0].name, rules.players[1].name],
    bots,
    winner: rules.winner?.seat ?? null,
    points: [rules.players[0].points, rules.players[1].points],
    rounds: rules.round,
    game,
    moves: moves.flat(),
  })
  return true
}
