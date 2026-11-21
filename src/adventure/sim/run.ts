import { cardsFromPack, isAdventurePack } from '../cards'
import { checkDeck } from '../deck'
import { BOT_LEVELS, type BotLevel } from '../bot'
import { TFQ_CARDS } from '../fixtures/allCards'
import { randomDeck } from '../deckgen/values'
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

/** Eight random legal Free Companies from The First Quest (tfq.csv). */
function tfqDecks(seed: number) {
  const decks: Record<string, string[]> = {}
  for (let i = 0; i < 8; i++) decks[`TFQ deck ${i + 1}`] = randomDeck(TFQ_CARDS, seed * 31 + i)[0]
  return decks
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
    : { cards: TFQ_CARDS, decks: tfqDecks(a.seed), skipped: [] }
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
