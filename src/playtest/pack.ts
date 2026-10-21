import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { GameSetup } from './setup'

/**
 * A game pack: everything the Playtest app needs from a Hearthside Cardworks project,
 * in one zip (.cmpack). Card pictures as JPEG (identical pictures stored
 * once), each card's field values by field name (for a rules engine later),
 * the decks, and optionally table setups.
 *
 *   pack.json
 *   images/<hash>.jpg
 */
export const PACK_FORMAT = 'card-maker-game-pack'
export const PACK_VERSION = 1
export const PACK_EXT = '.cmpack'
const INFO = 'pack.json'

/** A field value as the Playtest app reads it: plain text, or a number (icon rows). */
export type PackValue = string | number

export interface PackCard {
  id: string
  name: string
  /** Size in mm. */
  w: number
  h: number
  fields: Record<string, PackValue>
  /** Paths inside the pack. `back` is null for a card without a back. */
  front: string
  back: string | null
}

export interface PackDeck {
  name: string
  counts: Record<string, number>
}

export interface PackInfo {
  format: typeof PACK_FORMAT
  version: number
  name: string
  /** The Hearthside Cardworks project it came from (a newer export of it replaces the old one). */
  projectId: string
  exportedAt: number
  appVersion?: string
  /** The project's card size in mm (built-in tables are sized from it). */
  cardSize: { w: number; h: number }
  /** The whole card pool, also cards that are in no deck. */
  cards: PackCard[]
  decks: PackDeck[]
  setups?: GameSetup[]
}

export interface GamePack {
  info: PackInfo
  /** Picture bytes by path. */
  images: Record<string, Uint8Array>
}

export interface PackInput {
  name: string
  projectId: string
  exportedAt: number
  appVersion?: string
  cardSize: { w: number; h: number }
  cards: (Omit<PackCard, 'front' | 'back'> & { front: Uint8Array; back: Uint8Array | null })[]
  decks: PackDeck[]
  setups?: GameSetup[]
}

async function hashOf(bytes: Uint8Array) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>))
  return [...d.slice(0, 10)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Build the .cmpack file. */
export async function buildPack(input: PackInput): Promise<Uint8Array> {
  const files: Record<string, [Uint8Array, { level: 0 }]> = {}
  const store = async (bytes: Uint8Array) => {
    const path = `images/${await hashOf(bytes)}.jpg`
    files[path] = [bytes, { level: 0 }]
    return path
  }
  const cards: PackCard[] = []
  for (const c of input.cards)
    cards.push({
      ...c,
      front: await store(c.front),
      back: c.back ? await store(c.back) : null,
    })
  const ids = new Set(cards.map((c) => c.id))
  const info: PackInfo = {
    format: PACK_FORMAT,
    version: PACK_VERSION,
    name: input.name,
    projectId: input.projectId,
    exportedAt: input.exportedAt,
    ...(input.appVersion && { appVersion: input.appVersion }),
    cardSize: input.cardSize,
    cards,
    decks: input.decks.map((d) => ({
      name: d.name,
      counts: Object.fromEntries(
        Object.entries(d.counts).filter(([id, n]) => ids.has(id) && n > 0),
      ),
    })),
    ...(input.setups?.length && { setups: input.setups }),
  }
  return zipSync({ [INFO]: strToU8(JSON.stringify(info, null, 1)), ...files })
}

const fail = (m: string): never => {
  throw new Error(m)
}

/** Open a .cmpack file (throws a readable message when it isn't one or is damaged). */
export function readPack(bytes: Uint8Array): GamePack {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch {
    return fail('This is not a game pack (it is not a zip file).')
  }
  if (!entries[INFO]) fail('This is not a game pack (pack.json is missing).')
  let info: PackInfo
  try {
    info = JSON.parse(strFromU8(entries[INFO]))
  } catch {
    return fail('The game pack is damaged (pack.json is not valid).')
  }
  if (info?.format !== PACK_FORMAT) fail('This is not a Hearthside Cardworks game pack.')
  if (typeof info.version !== 'number' || info.version > PACK_VERSION)
    fail('This game pack was made by a newer version. Update the Playtest app to open it.')
  if (!Array.isArray(info.cards) || !Array.isArray(info.decks) || !info.cardSize)
    fail('The game pack is damaged (its card list is missing).')
  const images: Record<string, Uint8Array> = {}
  for (const c of info.cards) {
    if (typeof c?.id !== 'string' || typeof c.front !== 'string')
      fail('The game pack is damaged (a card is incomplete).')
    for (const p of [c.front, c.back]) {
      if (p === null) continue
      if (!entries[p]) fail(`The game pack is damaged (the picture of "${c.name}" is missing).`)
      images[p] = entries[p]
    }
    c.fields ??= {}
  }
  return { info, images }
}
