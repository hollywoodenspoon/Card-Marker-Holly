import { cardsFromPack, isAdventurePack } from '../cards'
import { checkDeck } from '../deck'
import { BOT_LEVELS, type BotLevel } from '../bot'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '../fixtures/firstQuest'
import { readPack } from '@/playtest/pack'
import { report, simulate } from './sim'

/** Read a game pack's cards and its legal Free Companies (for `npm run as:sim -- --pack`). */
export function packDecks(bytes: Uint8Array) {
  const { info } = readPack(bytes)
  if (!isAdventurePack(info.cards))
    throw new Error('This game pack has no Adventure Scuffle (_AS) fields.')
  const { cards } = cardsFromPack(info.cards)
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
  const decks: Record<string, string[]> = {}
  const skipped: string[] = []
  for (const d of info.decks) {
    const ids = Object.entries(d.counts).flatMap(([id, n]) => Array(n).fill(id) as string[])
    const check = checkDeck(ids, byId)
    if (check.ok) decks[d.name] = ids
    else skipped.push(`${d.name}: ${check.problems[0]}`)
  }
  return { cards, decks, skipped }
}

export interface RunArgs {
  games: number
  levels: BotLevel[]
  seed: number
  playouts?: number
  pack?: Uint8Array
}

export function run(a: RunArgs, onGame?: (n: number) => void) {
  const levels = a.levels.map((l) => (BOT_LEVELS.includes(l) ? l : 'normal')) as BotLevel[]
  const src = a.pack
    ? packDecks(a.pack)
    : { cards: FIRST_QUEST, decks: FIRST_QUEST_DECKS, skipped: [] }
  if (Object.keys(src.decks).length === 0) throw new Error('No legal Free Company in the pack.')
  const r = simulate({
    cards: src.cards,
    decks: src.decks,
    games: a.games,
    levels: [levels[0], levels[1] ?? levels[0]],
    seed: a.seed,
    playouts: a.playouts,
    onGame,
  })
  const notes = src.skipped.length
    ? `\n## Decks left out\n\n${src.skipped.map((s) => `- ${s}`).join('\n')}\n`
    : ''
  return report(r) + notes
}
