import { SEATS, type AsState, type Seat } from '@/adventure/state'
import { pieceId } from '@/adventure/table'
import { zoneKey } from '@/playtest/setup'

/**
 * What changed between two moments of a rules game, for the screen: which
 * cards to light up, and arrows for cards that swapped or moved. Pure, so the
 * table, the callout and replays all read the same cues.
 */

export type CueKind =
  'reveal' | 'ability' | 'attack' | 'defend' | 'fs' | 'moved' | 'rest' | 'return'

/** The glow for each kind of action cue. */
export const CUE_RING: Record<CueKind, string> = {
  reveal: 'ring-sky-400',
  ability: 'ring-violet-400',
  attack: 'ring-red-500',
  defend: 'ring-emerald-500',
  fs: 'ring-amber-400',
  moved: 'ring-cyan-300',
  rest: 'ring-slate-400',
  return: 'ring-lime-400',
}

/** One end of an arrow: a card on the table, or a field position. */
export type ArrowEnd = { piece: string } | { zone: string; slot?: number }

export interface Arrow {
  from: ArrowEnd
  to: ArrowEnd
  /** Two cards traded places. */
  both: boolean
}

export interface Cues {
  glow: Record<string, CueKind>
  arrows: Arrow[]
}

type Where =
  { z: 'field'; slot: number } | { z: 'support' } | { z: 'rest' } | { z: 'spent' } | { z: 'none' }

function where(s: AsState, seat: Seat, card: string): Where {
  const p = s.players[seat]
  const slot = p.field.findIndex((f) => f.card === card)
  if (slot >= 0) return { z: 'field', slot }
  if (p.support.includes(card)) return { z: 'support' }
  if (p.spent.includes(card)) return { z: 'spent' }
  if (p.rest.includes(card)) return { z: 'rest' }
  return { z: 'none' }
}

const cardsOf = (s: AsState, seat: Seat) => {
  const p = s.players[seat]
  return [...p.field.flatMap((f) => (f.card ? [f.card] : [])), ...p.support, ...p.rest, ...p.spent]
}

export function cues(prev: AsState, next: AsState): Cues {
  const glow: Record<string, CueKind> = {}
  const arrows: Arrow[] = []
  // Only the strongest cue per card: an ability beats being moved, and so on.
  const rank: CueKind[] = ['ability', 'fs', 'reveal', 'moved', 'return', 'rest', 'attack', 'defend']
  const mark = (id: string, k: CueKind) => {
    const old = glow[id]
    if (!old || rank.indexOf(k) < rank.indexOf(old)) glow[id] = k
  }
  for (const seat of SEATS) {
    const fieldKey = zoneKey('field', seat)
    const a = prev.players[seat]
    const b = next.players[seat]
    const paired = new Set<string>()
    for (const card of cardsOf(next, seat)) {
      const id = pieceId(seat, card)
      const was = where(prev, seat, card)
      const now = where(next, seat, card)
      if (now.z === 'field') {
        const f = b.field[now.slot]
        const before = was.z === 'field' ? a.field[was.slot] : null
        if (f.faceUp && before && !before.faceUp) mark(id, 'reveal')
        if (before && f.state !== before.state) {
          if (f.state === 'ability') mark(id, 'ability')
          else if (f.state === 'attacking') mark(id, 'attack')
          else if (f.state === 'defending') mark(id, 'defend')
        }
      }
      const moved =
        was.z !== now.z || (was.z === 'field' && now.z === 'field' && was.slot !== now.slot)
      if (!moved) continue
      if (now.z === 'rest' || now.z === 'spent') {
        // Resting after being used isn't a move worth an arrow.
        mark(id, now.z === 'spent' ? 'fs' : 'rest')
        continue
      }
      if (now.z === 'support' && was.z === 'rest') {
        mark(id, 'return')
        continue
      }
      mark(id, 'moved')
      if (now.z !== 'field' || paired.has(card)) continue
      // Who was here before: a swap partner, or the card this one replaced.
      const gone = a.field[now.slot].card
      if (gone && gone !== card) {
        const gWas = where(prev, seat, gone)
        const gNow = where(next, seat, gone)
        const traded =
          gNow.z === 'field' ? was.z === 'field' && gNow.slot === was.slot : gWas.z === 'field'
        if (traded) {
          paired.add(card).add(gone)
          mark(pieceId(seat, gone), 'moved')
          arrows.push({ from: { piece: id }, to: { piece: pieceId(seat, gone) }, both: true })
          continue
        }
      }
      arrows.push({
        from:
          was.z === 'field'
            ? { zone: fieldKey, slot: was.slot }
            : { zone: zoneKey(was.z === 'spent' ? 'rest' : was.z, seat) },
        to: { piece: id },
        both: false,
      })
    }
    // Fighting Spirit revealed from the rest zone stays there: light it up.
    const fsNow = next.engagement?.fs[seat] ?? []
    const fsWas = prev.engagement?.fs[seat] ?? []
    for (const f of fsNow)
      if (!fsWas.some((x) => x.card === f.card)) mark(pieceId(seat, f.card), 'fs')
  }
  return { glow, arrows }
}

/**
 * The cards a log line is about, in the order the line names them: a name
 * match on the cards in play (longest names first, so "Haughty Knight" isn't
 * also read as "Knight"), then the cards the cues lit up.
 */
export function cardsInLine(s: AsState, text: string, glow: Record<string, CueKind>): string[] {
  const all = SEATS.flatMap((seat) => cardsOf(s, seat).map((card) => ({ seat, card })))
  const named = all
    .map((c) => ({ ...c, name: s.cards[c.card]?.name ?? '' }))
    .filter((c) => c.name)
    .sort((x, y) => y.name.length - x.name.length)
  const taken: [number, number][] = []
  const hits: { at: number; id: string }[] = []
  for (const c of named) {
    let from = 0
    for (;;) {
      const at = text.indexOf(c.name, from)
      if (at < 0) break
      from = at + c.name.length
      if (taken.some(([x, y]) => at < y && from > x)) continue
      // The same card can be in both decks: prefer the copy that just changed.
      const id = pieceId(c.seat, c.card)
      const twin = pieceId(c.seat === 0 ? 1 : 0, c.card)
      if (!glow[id] && glow[twin]) break
      taken.push([at, from])
      hits.push({ at, id })
    }
  }
  const ids = hits.sort((x, y) => x.at - y.at).map((h) => h.id)
  for (const id of Object.keys(glow)) if (!ids.includes(id)) ids.push(id)
  return [...new Set(ids)]
}
