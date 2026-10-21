import { zoneKey, type GameSetup } from '@/playtest/setup'
import type { Piece, TableState, TokenInst } from '@/playtest/state'
import { SEATS, type AsState, type Seat } from './state'

/** A card's piece id on the table. */
export const pieceId = (seat: Seat, card: string) => `s${seat}-${card}`

/** The piece's seat and card, from its id. */
export function parsePieceId(id: string): { seat: Seat; card: string } | null {
  const m = /^s([01])-(.+)$/.exec(id)
  return m ? { seat: Number(m[1]) as Seat, card: m[2] } : null
}

const PHASE: Record<AsState['phase'], number> = {
  setup: 0,
  skirmish: 0,
  combat: 1,
  regroup: 2,
  over: 2,
}

/**
 * Draw a rules game on the Adventure Scuffle table (`adventureScuffle` in
 * playtest/setup.ts), so the table, tracker and card zoom show it unchanged.
 * Fighting Spirit cards show face up on top of the rest zone.
 */
export function toTable(setup: GameSetup, s: AsState): TableState {
  const pieces: Record<string, Piece> = {}
  const zones: TableState['zones'] = {}
  const tokens: Record<string, TokenInst> = {}
  const counters: Record<string, number> = {}
  const add = (seat: Seat, card: string, faceUp: boolean, state = 'ready') => {
    const id = pieceId(seat, card)
    pieces[id] = {
      id,
      cardId: card,
      name: s.cards[card]?.name ?? 'Card',
      owner: seat,
      faceUp,
      state,
    }
    return id
  }
  let t = 0
  for (const seat of SEATS) {
    const p = s.players[seat]
    zones[zoneKey('field', seat)] = {
      slots: p.field.map((f) => (f.card ? [add(seat, f.card, f.faceUp, f.state)] : [])),
    }
    zones[zoneKey('rest', seat)] = {
      items: [...p.rest, ...p.spent].map((c) => add(seat, c, true)),
    }
    zones[zoneKey('support', seat)] = { items: p.support.map((c) => add(seat, c, false)) }
    const main = p.mainAttacker === null ? null : p.field[p.mainAttacker].card
    const id = `t${++t}`
    tokens[id] = {
      id,
      tokenId: 'main-attacker',
      owner: seat,
      at: main ? { piece: pieceId(seat, main) } : { pool: true },
    }
    counters[zoneKey('points', seat)] = p.points
  }
  return {
    setupId: setup.id,
    seed: s.seed,
    pieces,
    zones,
    tokens,
    counters,
    phase: PHASE[s.phase],
    round: s.round,
    initiative: s.initiative,
    last: {},
    winner: s.winner,
    log: s.log.map((l) => ({ n: l.n, text: l.flag ? `⚑ ${l.text}` : l.text })),
  }
}
