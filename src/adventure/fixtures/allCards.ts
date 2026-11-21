import csv from '../../../game/adventure-scuffle/cards.csv?raw'
import tfqCsv from '../../../game/adventure-scuffle/tfq.csv?raw'
import { parseDelimited } from '@/storage/sheetFiles'
import type { PackCard } from '@/playtest/pack'
import { cardsFromPack, type AsCard } from '../cards'

/**
 * Every Adventure Scuffle card, read from `game/adventure-scuffle/cards.csv`
 * (the source of truth) the way Hearthside Cardworks exports a pack. Card id =
 * code in lower case without the dash, as in the other fixtures.
 */
function read(text: string): AsCard[] {
  const [head, ...rows] = parseDelimited(text)
  const pack: PackCard[] = rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => {
      const fields = Object.fromEntries(head.map((k, i) => [k, r[i] ?? '']))
      const id = String(fields.Code_AS).toLowerCase().replace('-', '')
      return { id, name: String(fields.Name_AS), w: 63, h: 88, fields, front: '', back: null }
    })
  return cardsFromPack(pack).cards
}

export const ALL_CARDS: AsCard[] = read(csv)

/** The First Quest as played now, from `game/adventure-scuffle/tfq.csv`. */
export const TFQ_CARDS: AsCard[] = read(tfqCsv)
