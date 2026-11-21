import { TFQ_CARDS } from '../fixtures/allCards'
import { checkGame } from '../check'
import type { GameRecord } from '../lab/play'
import { packDecks } from './run'

/**
 * Replay saved games (a .jsonl from as:sim --games-out or the Balance lab)
 * through the rules checker: every move must be legal, no card lost or
 * doubled, full fields each round, Fighting Spirit at most 3.
 */
export function checkRecords(text: string, pack?: Uint8Array) {
  const cards = pack ? packDecks(pack).cards : TFQ_CARDS
  const lines = text.split('\n').filter((l) => l.trim())
  const problems: string[] = []
  let bad = 0
  for (const [i, line] of lines.entries()) {
    const g = JSON.parse(line) as GameRecord
    const { problems: found, final } = checkGame(
      { cards, decks: g.decks, names: ['A', 'B'], seed: g.seed, mode: g.mode },
      g.moves,
    )
    const where = `game ${i + 1} (seed ${g.seed})`
    if (!found.length && g.winner !== (final.winner?.seat ?? null))
      found.push({
        move: g.moves.length,
        round: final.round,
        text: 'replay ends with a different winner',
        log: [],
      })
    if (found.length) bad++
    for (const p of found)
      problems.push(
        `${where}, move ${p.move + 1} (round ${p.round}): ${p.text}\n    ${p.log.join('\n    ')}`,
      )
  }
  return { games: lines.length, bad, problems }
}
