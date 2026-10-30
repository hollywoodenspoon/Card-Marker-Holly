/**
 * Decks, one system: when Play runs an Engine game, its deck list and deck builder
 * read and write the game's own decks (GameDoc.decks) through Play's deck bridge
 * (src/playtest/library.ts). The open game is changed through its store, so it's
 * undoable in the Engine; any other game is changed in the database.
 * The first time a game's decks are read, decks built in Play for its card sources
 * (before the merge) are copied in, so nothing made there is lost.
 */
import { newId } from '@/core/model/ids'
import { playtestDb, setDeckBridge, type DeckRow } from '@/playtest/library'
import { countsOf, deckList, type GameDeck, type GameDoc } from '../model/game'
import { db } from '../storage/db'
import { games } from '../storage/games'
import { useGame } from '../store/gameStore'

const known = new Set<string>()
/** Tell Play that this id is an Engine game (its decks live in the game). */
export const rememberGame = (id: string) => known.add(id)

const toRow = (gameId: string, d: GameDeck): DeckRow => ({
  id: d.id,
  packId: gameId,
  name: d.name,
  cards: deckList(d),
  updatedAt: 0,
})

async function gameById(id: string): Promise<GameDoc | undefined> {
  const open = useGame.getState().game
  return open.id === id ? open : games.load(id)
}

async function change(id: string, recipe: (g: GameDoc) => void) {
  if (useGame.getState().game.id === id) return useGame.getState().commit(recipe)
  const g = await games.load(id)
  if (!g) return
  recipe(g)
  await games.save(g)
}

/** Copy decks that Play kept for this game's sources (once per game). */
async function importOldDecks(g: GameDoc) {
  const key = `decksImported:${g.id}`
  if (await db.settings.get(key)) return
  await db.settings.put({ key, value: true })
  const ids = g.sources.map((s) => s.id)
  const rows = (await playtestDb().decks.where('packId').anyOf(ids).toArray()).filter(
    (r) => !g.decks.some((d) => d.name === r.name),
  )
  if (!rows.length) return
  await change(g.id, (x) => {
    for (const r of rows) x.decks.push({ id: newId(), name: r.name, counts: countsOf(r.cards), origin: 'game' })
  })
}

export function installDeckBridge() {
  setDeckBridge({
    owns: (packId) => known.has(packId) || useGame.getState().game.id === packId,
    list: async (packId) => {
      let g = await gameById(packId)
      if (!g) return []
      await importOldDecks(g)
      g = (await gameById(packId)) ?? g
      return g.decks.filter((d) => d.origin === 'game').map((d) => toRow(packId, d))
    },
    save: async (row) => {
      await change(row.packId, (g) => {
        const counts = countsOf(row.cards)
        const d = g.decks.find((x) => x.id === row.id)
        if (d) {
          d.name = row.name
          d.counts = counts
        } else g.decks.push({ id: row.id, name: row.name, counts, origin: 'game' })
      })
    },
    remove: async (id) => {
      const open = useGame.getState().game
      const owner = open.decks.some((d) => d.id === id)
        ? open.id
        : (await db.games.toArray()).find((g) => g.decks?.some((d) => d.id === id))?.id
      if (!owner) return false
      await change(owner, (g) => {
        g.decks = g.decks.filter((d) => d.id !== id)
      })
      return true
    },
  })
}
