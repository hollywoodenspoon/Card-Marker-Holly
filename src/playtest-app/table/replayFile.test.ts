import { describe, expect, it } from 'vitest'
import { checkGame } from '@/adventure/check'
import { apply, createGame, legalMoves, type Move, type NewGame } from '@/adventure/engine'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '@/adventure/fixtures/firstQuest'
import { missingCards, readReplayFile, replayFile } from './replayFile'

const game: NewGame = {
  cards: FIRST_QUEST,
  decks: [FIRST_QUEST_DECKS["Adventurer's Guild"], FIRST_QUEST_DECKS['Necromancer Deck']],
  names: ['Ann', 'Bo'],
  seed: 4,
}
/** The first legal move, 60 times: an unfinished game. */
function someMoves(): Move[] {
  let s = createGame(game)
  const moves: Move[] = []
  for (let n = 0; n < 60; n++) {
    const m = legalMoves(s)[0]
    if (!m) break
    moves.push(m)
    s = apply(s, m)
  }
  return moves
}

describe('replay files', () => {
  it('round-trips a game, unfinished too, and it replays cleanly', () => {
    const moves = someMoves()
    const file = replayFile({ game, moves, bots: ['hard', null], source: 'bot' }, 'The First Quest')
    expect(file.replay.names).toEqual(['Ann', 'Bo'])
    const row = readReplayFile(JSON.stringify(file), 'pack-1')
    expect(row.packId).toBe('pack-1')
    expect(row.moves).toEqual(moves)
    expect(row.bots).toEqual(['hard', null])
    expect(checkGame(row.game, row.moves).problems).toEqual([])
  })

  it('refuses other files with a readable reason', () => {
    expect(() => readReplayFile('not json', 'p')).toThrow('not a replay file')
    expect(() => readReplayFile('{"format":"x"}', 'p')).toThrow('not a replay file')
    expect(() => readReplayFile('{"kind":"hearthside-replay","version":2}', 'p')).toThrow('newer')
    expect(() => readReplayFile('{"kind":"hearthside-replay","version":1}', 'p')).toThrow('damaged')
  })

  it('lists cards the open pack lacks', () => {
    expect(missingCards({ game }, FIRST_QUEST.slice(1))).toEqual([FIRST_QUEST[0].id])
  })
})
