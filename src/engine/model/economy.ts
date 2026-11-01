/**
 * Money, items, the card collection, shops and boosters. Money is one number
 * variable the game picks. Items have a picture and a price and are kept as
 * counts. The collection counts normal and foil copies of each card apart.
 * Shops sell items, single cards and boosters, and can buy back. A booster
 * opens into a few cards, each rolling its own rarity. Pure data, no UI.
 */
import { newId } from '@/core/model/ids'
import type { ImageRef } from './game'

export interface Item {
  id: string
  name: string
  description: string
  image: ImageRef | null
  price: number
}

/** A rarity a booster card can roll: which cards (Ace or not) and whether it's foil. */
export interface Rarity {
  id: string
  name: string
  ace: boolean
  foil: boolean
  /** A weight; shown as a percentage of all the booster's weights. */
  chance: number
}

export interface Booster {
  id: string
  name: string
  image: ImageRef | null
  price: number
  /** Cards per pack. */
  size: number
  /** The cards it can hold: a deck (list) of the game, or all the game's cards. */
  pool: string | null
  rarities: Rarity[]
}

/** Limited stock: starts at `max` and refills by `refill` each week. */
export interface StockRule {
  max: number
  refill: number
}

export type ShopEntry =
  | { id: string; kind: 'item'; ref: string; price: number | null; stock?: StockRule }
  | { id: string; kind: 'booster'; ref: string; price: number | null; stock?: StockRule }
  | { id: string; kind: 'card'; ref: string; foil: boolean; price: number; stock?: StockRule; market?: boolean }

/** The four rarities, by Ace and foil (the key for prices). */
export type RarityKey = 'common' | 'uncommon' | 'rare' | 'diamond'

export interface Shop {
  id: string
  name: string
  /** A picture shown at the top (a shopkeeper, a sign). */
  image: ImageRef | null
  sells: ShopEntry[]
  /** Buying back from the player: % of an item's price (0 = doesn't buy items). */
  buyItems: number
  /** What it pays per card, by rarity (0 = doesn't buy those). */
  buyCards: Record<RarityKey, number>
}

/** The game's money, collection and Ace settings. */
export interface Economy {
  /** The number variable that is the money (its value is the player's money). */
  money: string | null
  /** Shown after amounts: "50 coins". Empty: just the number. */
  unit: string
  /** The card field that makes a card an Ace (uncommon in boosters). */
  aceField: string
  /** The text in that field that means Ace ("{ace}"). Empty: any value but blank, 0, no or false. */
  aceText: string
  /** A deck of the game the player's collection starts with (normal copies). */
  startingCards: string | null
}

export const DEFAULT_RARITIES = (): Rarity[] => [
  { id: newId(), name: 'Common', ace: false, foil: false, chance: 70 },
  { id: newId(), name: 'Uncommon', ace: true, foil: false, chance: 22 },
  { id: newId(), name: 'Rare', ace: false, foil: true, chance: 6 },
  { id: newId(), name: 'Diamond rare', ace: true, foil: true, chance: 2 },
]

export const newItem = (name: string): Item => ({
  id: newId(),
  name,
  description: '',
  image: null,
  price: 10,
})

export const newBooster = (name: string): Booster => ({
  id: newId(),
  name,
  image: null,
  price: 15,
  size: 3,
  pool: null,
  rarities: DEFAULT_RARITIES(),
})

export const newShop = (name: string): Shop => ({
  id: newId(),
  name,
  image: null,
  sells: [],
  buyItems: 50,
  buyCards: { common: 1, uncommon: 3, rare: 5, diamond: 20 },
})

export const defaultEconomy = (): Economy => ({
  money: null,
  unit: '',
  aceField: '',
  aceText: '',
  startingCards: null,
})

export const rarityKey = (ace: boolean, foil: boolean): RarityKey =>
  foil ? (ace ? 'diamond' : 'rare') : ace ? 'uncommon' : 'common'

export const RARITY_LABELS: Record<RarityKey, string> = {
  common: 'Common',
  uncommon: 'Uncommon (Ace)',
  rare: 'Rare (foil)',
  diamond: 'Diamond rare (foil Ace)',
}

/** Whether a card's fields make it an Ace, by the game's setting. */
export function isAce(fields: Record<string, string | number>, e: Economy): boolean {
  if (!e.aceField) return false
  const raw = fields[e.aceField]
  if (raw === undefined || raw === null) return false
  const v = String(raw).trim().toLowerCase()
  if (e.aceText.trim()) return v.includes(e.aceText.trim().toLowerCase())
  return v !== '' && v !== '0' && v !== 'no' && v !== 'false'
}

/** "50 coins" (or "50" with no unit). */
export const money = (n: number, e: Economy) => (e.unit.trim() ? `${n} ${e.unit.trim()}` : `${n}`)
