/**
 * Play opens an Engine game like a pack: its merged cards (the id is the game's,
 * so replays, Rush, tournaments and the lab keep their data per game) and its own
 * decks through the deck bridge. Loaded lazily by the Play workspace.
 */
import type { OpenPack } from '@/playtest-app/table/packContext'
import { installDeckBridge, rememberGame } from '../cards/deckBridge'
import { loadGameCards, useGameCards } from '../cards/gameCards'
import { registerAdventureScuffle } from '../modules/adventureScuffle'
import { games } from '../storage/games'
import { useGame } from '../store/gameStore'

let ready = false
/** The engine pieces Play needs, set up once. */
export function setUpEngineForPlay() {
  if (ready) return
  ready = true
  installDeckBridge()
  registerAdventureScuffle()
}

/** The game's cards for the table, loading them when needed. Null if there's no such game. */
export async function openGameForPlay(id: string): Promise<OpenPack | null> {
  setUpEngineForPlay()
  rememberGame(id)
  const st = useGameCards.getState()
  if (st.gameId === id && st.status === 'ready') return st.open
  const open = useGame.getState().game
  const game = open.id === id ? open : await games.load(id)
  if (!game) return null
  await loadGameCards(game)
  const now = useGameCards.getState()
  return now.gameId === id ? now.open : null
}

export async function listGamesForPlay() {
  return games.list()
}
