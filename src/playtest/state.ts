import type { Id } from '@/core/model/types'
import { shuffle } from './rng'
import { slotCount, zoneKey, zoneRefs, type GameSetup, type ZoneDef } from './setup'

/** One card on the table (a deck with two copies of a card makes two pieces). */
export interface Piece {
  id: string
  cardId: Id
  name: string
  owner: number
  faceUp: boolean
  /** A card state id from the setup. */
  state: string
}

/** What a zone holds. Grids: a list of piece ids per slot. Others: pieces in order (a stack's top is last). */
export interface ZoneContents {
  slots?: string[][]
  items?: string[]
  /** Area only: where each piece sits (mm from the zone's corner). */
  pos?: Record<string, { x: number; y: number }>
}

export type TokenAt =
  { pool: true } | { piece: string } | { zone: string; slot?: number; x?: number; y?: number }

export interface TokenInst {
  id: string
  tokenId: string
  owner: number | null
  at: TokenAt
}

export interface LogEntry {
  n: number
  text: string
}

export interface TableState {
  setupId: Id
  /** The random number generator's state (every random action advances it). */
  seed: number
  pieces: Record<string, Piece>
  zones: Record<string, ZoneContents>
  tokens: Record<string, TokenInst>
  /** Counter values by `zoneKey(counterId, seat)`. */
  counters: Record<string, number>
  phase: number
  round: number
  initiative: number
  last: {
    coin?: 'Heads' | 'Tails'
    roll?: { name: string; values: number[] }
    /** The piece a random pick chose. */
    picked?: string
  }
  winner: { seat: number | null; reason: string } | null
  log: LogEntry[]
}

/** A deck's cards in play order, one entry per copy. */
export type DeckCards = { cardId: Id; name: string }[]

/** Where a piece is: its zone key, and its slot (grids) or index (other zones). */
export interface Location {
  key: string
  slot?: number
  index: number
}

export function emptyContents(z: ZoneDef): ZoneContents {
  if (z.kind === 'grid') return { slots: Array.from({ length: slotCount(z) }, () => []) }
  if (z.kind === 'area') return { items: [], pos: {} }
  return { items: [] }
}

/** A new table: each seat's deck in the deal zone, tokens in their trays, counters at their start. */
export function createTable(
  setup: GameSetup,
  decks: (DeckCards | null)[],
  seed: number,
): TableState {
  const zones: Record<string, ZoneContents> = {}
  for (const ref of zoneRefs(setup)) zones[zoneKey(ref.zone.id, ref.seat)] = emptyContents(ref.zone)
  const pieces: Record<string, Piece> = {}
  let n = 0
  let s = seed
  const deal = setup.deal && setup.zones.find((z) => z.id === setup.deal!.zoneId)
  const first = setup.cardStates[0]?.id ?? ''
  if (deal)
    setup.seats.forEach((_, seat) => {
      const ids = (decks[seat] ?? []).map((c) => {
        const id = `p${++n}`
        pieces[id] = {
          id,
          cardId: c.cardId,
          name: c.name,
          owner: seat,
          faceUp: deal.face === 'up',
          state: first,
        }
        return id
      })
      let order = ids
      // A dealt pile is shuffled; a hand keeps the deck's order.
      if (deal.kind === 'stack') [order, s] = shuffle(ids, s)
      const zc = zones[zoneKey(deal.id, seat)]
      if (zc.slots) order.forEach((id, i) => zc.slots![i % zc.slots!.length].push(id))
      else zc.items = order
    })
  const tokens: Record<string, TokenInst> = {}
  let t = 0
  for (const def of setup.tokens) {
    const owners = def.perSeat ? setup.seats.map((_, i) => i) : [null]
    for (const owner of owners)
      for (let i = 0; i < def.count; i++) {
        const id = `t${++t}`
        tokens[id] = { id, tokenId: def.id, owner, at: { pool: true } }
      }
  }
  const counters: Record<string, number> = {}
  for (const c of setup.counters) {
    if (c.perSeat) setup.seats.forEach((_, i) => (counters[zoneKey(c.id, i)] = c.start))
    else counters[c.id] = c.start
  }
  return {
    setupId: setup.id,
    seed: s,
    pieces,
    zones,
    tokens,
    counters,
    phase: 0,
    round: 1,
    initiative: 0,
    last: {},
    winner: null,
    log: [{ n: 1, text: `New game: ${setup.name}` }],
  }
}

/** Find a piece on the table. */
export function locate(state: TableState, pieceId: string): Location | null {
  for (const [key, zc] of Object.entries(state.zones)) {
    if (zc.slots) {
      for (let slot = 0; slot < zc.slots.length; slot++) {
        const index = zc.slots[slot].indexOf(pieceId)
        if (index >= 0) return { key, slot, index }
      }
    } else {
      const index = zc.items!.indexOf(pieceId)
      if (index >= 0) return { key, index }
    }
  }
  return null
}

/** Every piece in a zone (grids: slot by slot). */
export function piecesIn(state: TableState, key: string): string[] {
  const zc = state.zones[key]
  if (!zc) return []
  return zc.slots ? zc.slots.flat() : zc.items!
}

/**
 * A deck's cards in the Cards list order, one entry per copy. Without counts
 * (null) every card is taken once.
 */
export function deckCards(
  cards: { id: Id; name: string; order: number }[],
  counts: Record<Id, number> | null,
): DeckCards {
  const out: DeckCards = []
  for (const c of cards.slice().sort((a, b) => a.order - b.order)) {
    const n = counts ? (counts[c.id] ?? 0) : 1
    for (let i = 0; i < n; i++) out.push({ cardId: c.id, name: c.name || 'Card' })
  }
  return out
}
