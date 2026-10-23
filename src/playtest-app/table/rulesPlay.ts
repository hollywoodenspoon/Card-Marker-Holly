import { placePool, revealOptions, type Move } from '@/adventure/engine'
import { other, type AsState } from '@/adventure/state'
import { parsePieceId } from '@/adventure/table'
import type { TableAction } from '@/playtest/actions'
import { parseZoneKey, zoneKey } from '@/playtest/setup'

/**
 * The glue between the table (taps and drags on pieces) and the Adventure
 * Scuffle rules (moves). Pure functions, so they are easy to test.
 */

/** Where a card is in the rules state. */
function whereIs(s: AsState, pieceId: string) {
  const id = parsePieceId(pieceId)
  if (!id) return null
  const p = s.players[id.seat]
  const slot = p.field.findIndex((f) => f.card === id.card)
  if (slot >= 0) return { ...id, zone: 'field' as const, slot }
  if (p.support.includes(id.card)) return { ...id, zone: 'support' as const }
  if (p.rest.includes(id.card) || p.spent.includes(id.card)) return { ...id, zone: 'rest' as const }
  return null
}

/** A drag or tap-to-place on the table as rule moves (null: not allowed now). */
export function movesFor(s: AsState, a: TableAction): Move[] | null {
  const st = s.step
  if (a.t !== 'move' || st.k !== 'place') return null
  const at = whereIs(s, a.piece)
  if (!at || at.seat !== st.seat) return null
  const to = parseZoneKey(a.to.zone)
  if (to.seat !== st.seat) return null
  const field = s.players[st.seat].field
  if (to.zoneId === 'field') {
    const slot = a.to.slot ?? -1
    if (!field[slot] || field[slot].card) return null
    if (at.zone === st.from) return [{ t: 'place', card: at.card, slot }]
    if (at.zone === 'field' && st.placed.includes(at.slot))
      return [
        { t: 'unplace', slot: at.slot },
        { t: 'place', card: at.card, slot },
      ]
    return null
  }
  // In Regroup the rest zone is held in the Support row (see regroupHand).
  const backTo = to.zoneId === st.from || (st.from === 'rest' && to.zoneId === 'support')
  if (backTo && at.zone === 'field' && st.placed.includes(at.slot))
    return [{ t: 'unplace', slot: at.slot }]
  return null
}

/** What a tap on a piece does under the rules. */
export type TapResult =
  /** Play these moves. */
  | { kind: 'moves'; moves: Move[] }
  /** Remember a first pick (a pair reveal needs two). */
  | { kind: 'pick'; picks: number[] }
  /** Select it to place it with the next tap. */
  | { kind: 'place' }
  | null

/** The choice option a piece stands for (a target on the field, or a card in a zone). */
export function optionFor(s: AsState, pieceId: string) {
  const st = s.step
  const id = parsePieceId(pieceId)
  if (st.k !== 'choose' || !id) return null
  return (
    st.options.find((o) =>
      o.slot !== undefined
        ? o.seat === id.seat && s.players[id.seat].field[o.slot]?.card === id.card
        : o.card === id.card && (o.seat ?? st.seat) === id.seat,
    ) ?? null
  )
}

export function tapPiece(s: AsState, picks: number[], pieceId: string): TapResult {
  const st = s.step
  if (st.k === 'choose') {
    const o = optionFor(s, pieceId)
    return o ? { kind: 'moves', moves: [{ t: 'choose', id: o.id }] } : null
  }
  const at = whereIs(s, pieceId)
  if (!at || st.k === 'over') return null
  if (st.k === 'reveal') {
    if (at.zone !== 'field' || at.seat !== other(st.seat)) return null
    const opts = revealOptions(s, st.seat, st.count)
    if (!opts.some((o) => o.includes(at.slot))) return null
    const n = opts[0].length
    if (n === 1) return { kind: 'moves', moves: [{ t: 'reveal', slots: [at.slot] }] }
    if (picks.includes(at.slot)) return { kind: 'pick', picks: picks.filter((p) => p !== at.slot) }
    // Add to the picks while some option still holds them all; else start again here.
    const next = [...picks, at.slot]
    const chosen = opts.some((o) => next.every((i) => o.includes(i))) ? next : [at.slot]
    if (chosen.length === n)
      return { kind: 'moves', moves: [{ t: 'reveal', slots: [...chosen].sort((a, b) => a - b) }] }
    return { kind: 'pick', picks: chosen }
  }
  if (st.k === 'place' && at.seat === st.seat) {
    if (at.zone === st.from || (at.zone === 'field' && st.placed.includes(at.slot)))
      return { kind: 'place' }
  }
  return null
}

/** Pieces and empty positions to highlight for the player to act. */
export function hints(s: AsState, picks: number[]): { pieces: Set<string>; slots: Set<string> } {
  const pieces = new Set<string>()
  const slots = new Set<string>()
  const st = s.step
  const pid = (seat: 0 | 1, card: string | null) => card && pieces.add(`s${seat}-${card}`)
  if (st.k === 'reveal') {
    const opp = other(st.seat)
    const field = s.players[opp].field
    for (const o of revealOptions(s, st.seat, st.count)) {
      if (picks.length && !picks.every((p) => o.includes(p))) continue
      for (const i of o) if (!picks.includes(i)) pid(opp, field[i].card)
    }
  } else if (st.k === 'place') {
    const p = s.players[st.seat]
    if (p.field.some((f) => !f.card)) for (const c of placePool(s, st.seat)) pid(st.seat, c)
    for (const i of st.placed) pid(st.seat, p.field[i].card)
    p.field.forEach((f, i) => !f.card && slots.add(`${zoneKey('field', st.seat)}:${i}`))
  } else if (st.k === 'choose') {
    for (const o of st.options) {
      if (o.slot !== undefined && o.seat !== undefined)
        pid(o.seat, s.players[o.seat].field[o.slot]?.card ?? null)
      else if (o.card) pid(o.seat ?? st.seat, o.card)
    }
  }
  // Fighting Spirit is picked with the rules bar's buttons, not on the table.
  return { pieces, slots }
}
