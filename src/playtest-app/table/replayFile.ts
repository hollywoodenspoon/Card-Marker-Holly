import { VERSION_LABEL } from '@/app/appInfo'
import type { BotLevel } from '@/adventure/bot'
import { apply, createGame, type Move, type NewGame } from '@/adventure/engine'
import type { ReplayRow } from '@/playtest/library'
import { downloadBlob } from '@/ui/actions/download'

/**
 * Replay files: one rules game as a JSON file, to keep, share or send for a
 * rules check. A file holds the game's start (every card's values included)
 * and its moves, so it replays without the pack (only the pictures come from
 * the pack it's opened in). `src/adventure/check.test.ts` checks one.
 */

export const REPLAY_FILE = 'hearthside-replay'

export interface ReplayFile {
  kind: typeof REPLAY_FILE
  version: 1
  /** The app that saved it. */
  app: string
  exportedAt: number
  pack: string
  replay: Omit<ReplayRow, 'id' | 'packId' | 'savedAt' | 'pinned'>
}

/** The parts of a game a file needs; its result is worked out from the moves. */
export interface GameToSave {
  game: NewGame
  moves: Move[]
  bots: [BotLevel | null, BotLevel | null]
  source: ReplayRow['source']
  decks?: [string, string]
}

export function replayFile(g: GameToSave, pack: string): ReplayFile {
  let s = createGame(g.game)
  for (const m of g.moves) s = apply(s, m)
  return {
    kind: REPLAY_FILE,
    version: 1,
    app: VERSION_LABEL,
    exportedAt: Date.now(),
    pack,
    replay: {
      source: g.source,
      names: [s.players[0].name, s.players[1].name],
      ...(g.decks && { decks: g.decks }),
      bots: g.bots,
      winner: s.winner?.seat ?? null,
      points: [s.players[0].points, s.players[1].points],
      rounds: s.round,
      game: g.game,
      moves: g.moves,
    },
  }
}

/** Download a game as a replay file. */
export function exportReplay(g: GameToSave, pack: string) {
  const file = replayFile(g, pack)
  const day = new Date(file.exportedAt).toISOString().slice(0, 10)
  const name = `${file.replay.names.join(' vs ')} ${day}`.replace(/[^\w\- ]+/g, '').trim()
  downloadBlob(
    new Blob([JSON.stringify(file)], { type: 'application/json' }),
    `${name || 'replay'}.hsreplay.json`,
  )
}

/** Read a replay file as a replay of the open pack. Throws an Error a person can read. */
export function readReplayFile(
  text: string,
  packId: string,
): Omit<ReplayRow, 'savedAt' | 'pinned'> {
  let data: Partial<ReplayFile>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This is not a replay file.')
  }
  if (data?.kind !== REPLAY_FILE) throw new Error('This is not a replay file.')
  if (data.version !== 1) throw new Error('This replay file is from a newer version of the app.')
  const r = data.replay
  if (!r?.game?.cards || !Array.isArray(r.game.decks) || !Array.isArray(r.moves))
    throw new Error('This replay file is damaged.')
  return {
    ...r,
    id: `import-${data.exportedAt ?? 0}-${r.game.seed}`,
    packId,
  }
}

/** Card ids the replay uses that the open pack doesn't have (their pictures will be missing). */
export const missingCards = (r: Pick<ReplayRow, 'game'>, packCards: { id: string }[]) => {
  const have = new Set(packCards.map((c) => c.id))
  return [...new Set(r.game.decks.flat())].filter((id) => !have.has(id))
}
