import type { Id } from '@/core/model/types'

/**
 * A game setup describes a table for any game: who sits at it, which zones
 * there are, what states a piece can be in, tokens, counters and randomisers.
 * It knows nothing about a game's rules; the table engine is the same for
 * every game. All sizes are in mm.
 */
export interface GameSetup {
  id: Id
  name: string
  version: 1
  seats: SeatDef[]
  /**
   * How seat areas sit on the table. `facing`: two players across from each
   * other (the top seat is turned around, so its first row faces yours).
   * `stacked`: seat areas one under the other, all the same way up.
   */
  seatLayout: 'facing' | 'stacked'
  /** Size of one seat's area; per-seat zones are placed inside it. */
  seatArea: Size
  /** Size of the shared band between the seats (0 × 0 when nothing is shared). */
  sharedArea: Size
  zones: ZoneDef[]
  /** Card states, shown by turning the piece. The first one is the normal state. */
  cardStates: CardStateDef[]
  tokens: TokenDef[]
  counters: CounterDef[]
  /** Phase names, stepped by hand (labels only, no rules yet). */
  phases: string[]
  /** Show a first-player / initiative marker. */
  initiative: boolean
  /** Name for the initiative marker (e.g. "Initiative", "First player"). */
  initiativeName?: string
  coin: boolean
  dice: DiceDef[]
  /** Where each seat's chosen deck goes at the start, and an optional random setup. */
  deal: DealDef | null
}

export interface Size {
  w: number
  h: number
}

export interface SeatDef {
  name: string
  color: string
}

export type ZoneKind = 'grid' | 'stack' | 'row' | 'area'
/**
 * public: everyone sees face-up pieces; a face-down piece is known to its owner.
 * owner:  like a hand: the owner sees every piece, others see face-up ones only.
 * hidden: like a deck: nobody sees face-down pieces, not even the owner.
 */
export type Visibility = 'public' | 'owner' | 'hidden'
export type FaceRule = 'up' | 'down' | 'keep'

export interface ZoneDef {
  id: Id
  name: string
  kind: ZoneKind
  /** Every seat gets its own copy of this zone (in its seat area); otherwise it is shared. */
  perSeat: boolean
  /** Position and size in mm (inside the seat area, or inside the shared band). */
  x: number
  y: number
  w: number
  h: number
  /** Grid only. */
  rows?: number
  cols?: number
  rowNames?: string[]
  colNames?: string[]
  visibility: Visibility
  /** Which way up a piece lands when it enters this zone. */
  face: FaceRule
  /** Pieces per slot for a grid (default 1), or in total for other zones (unset = no limit). */
  capacity?: number
  /** Area only: a picture under the pieces (an image asset, or a card drawn as the board). */
  background?: { assetId?: Id; cardId?: Id }
}

export interface CardStateDef {
  id: string
  name: string
  /** Degrees clockwise. */
  rotation: number
}

export type TokenShape = 'cube' | 'disc' | 'pawn' | 'star'

export interface TokenDef {
  id: string
  name: string
  shape: TokenShape
  /** CSS colour; `seat` uses the owner's seat colour. */
  color: string | 'seat'
  /** Optional picture from the project's assets (drawn instead of the shape). */
  assetId?: Id
  /** How many each seat gets (per seat), or how many there are in total (shared). */
  perSeat: boolean
  count: number
  sizeMm: number
}

export interface CounterDef {
  id: string
  name: string
  perSeat: boolean
  min: number
  max: number
  start: number
  /** A seat (or the table) wins when it reaches this value. */
  winAt?: number
}

export interface DiceDef {
  id: string
  name: string
  count: number
  sides: number
}

export interface DealDef {
  /** The per-seat zone each seat's deck goes to. */
  zoneId: Id
  /** Warn when a deck doesn't have exactly this many cards. */
  deckSize?: number
  /** "Random setup" moves this many random pieces from the deal zone into this zone. */
  randomSetup?: { zoneId: Id; count: number }
}

/** A zone as placed for one seat (or shared: seat null). Its key is used in the table state. */
export interface ZoneRef {
  zone: ZoneDef
  seat: number | null
}

export const zoneKey = (zoneId: string, seat: number | null) =>
  seat === null ? zoneId : `${zoneId}@${seat}`

export function parseZoneKey(key: string): { zoneId: string; seat: number | null } {
  const at = key.lastIndexOf('@')
  return at < 0
    ? { zoneId: key, seat: null }
    : { zoneId: key.slice(0, at), seat: Number(key.slice(at + 1)) }
}

/** Every zone on the table, per seat for per-seat zones. */
export function zoneRefs(setup: GameSetup): ZoneRef[] {
  const out: ZoneRef[] = []
  for (const zone of setup.zones) {
    if (zone.perSeat) setup.seats.forEach((_, seat) => out.push({ zone, seat }))
    else out.push({ zone, seat: null })
  }
  return out
}

export const slotCount = (z: ZoneDef) => (z.kind === 'grid' ? (z.rows ?? 1) * (z.cols ?? 1) : 0)

/** "Front Line Flank" style name of a grid slot, or "row 1, column 2". */
export function slotName(z: ZoneDef, slot: number) {
  const cols = z.cols ?? 1
  const r = Math.floor(slot / cols)
  const c = slot % cols
  const rn = z.rowNames?.[r]
  const cn = z.colNames?.[c]
  if (rn && cn) return `${rn} ${cn}`
  return `row ${r + 1}, column ${c + 1}`
}

export const rowOf = (z: ZoneDef, slot: number) => Math.floor(slot / (z.cols ?? 1))
export const colOf = (z: ZoneDef, slot: number) => slot % (z.cols ?? 1)

/** Orthogonally neighbouring slots (up, down, left, right; not diagonal). */
export function adjacent(z: ZoneDef, slot: number): number[] {
  const rows = z.rows ?? 1
  const cols = z.cols ?? 1
  const r = rowOf(z, slot)
  const c = colOf(z, slot)
  const out: number[] = []
  if (r > 0) out.push(slot - cols)
  if (r < rows - 1) out.push(slot + cols)
  if (c > 0) out.push(slot - 1)
  if (c < cols - 1) out.push(slot + 1)
  return out
}

/** A placed rectangle in table mm. `turned`: the seat sits across the table. */
export interface PlacedZone extends ZoneRef {
  key: string
  x: number
  y: number
  w: number
  h: number
  turned: boolean
}

export interface TableLayout {
  w: number
  h: number
  zones: PlacedZone[]
  /** Each seat's area on the table (for its name label). */
  seats: { seat: number; x: number; y: number; w: number; h: number; turned: boolean }[]
}

/**
 * Where everything sits on the table. Facing: seat 2 at the top, turned
 * around (positions rotated 180°), the shared band in the middle, seat 1 at
 * the bottom. Stacked: seats top to bottom, shared band last.
 */
export function tableLayout(setup: GameSetup): TableLayout {
  const { seatArea: sa, sharedArea: sh } = setup
  const w = Math.max(sa.w, sh.w)
  const n = setup.seats.length
  const facing = setup.seatLayout === 'facing' && n === 2
  const seats: TableLayout['seats'] = []
  let shared = { x: (w - sh.w) / 2, y: 0 }
  if (facing) {
    seats.push({ seat: 1, x: (w - sa.w) / 2, y: 0, w: sa.w, h: sa.h, turned: true })
    shared = { x: (w - sh.w) / 2, y: sa.h }
    seats.push({ seat: 0, x: (w - sa.w) / 2, y: sa.h + sh.h, w: sa.w, h: sa.h, turned: false })
  } else {
    for (let s = 0; s < n; s++)
      seats.push({ seat: s, x: (w - sa.w) / 2, y: s * sa.h, w: sa.w, h: sa.h, turned: false })
    shared = { x: (w - sh.w) / 2, y: n * sa.h }
  }
  const h = facing ? sa.h * 2 + sh.h : n * sa.h + sh.h
  const zones: PlacedZone[] = zoneRefs(setup).map((ref) => {
    const z = ref.zone
    if (ref.seat === null)
      return {
        ...ref,
        key: zoneKey(z.id, null),
        x: shared.x + z.x,
        y: shared.y + z.y,
        w: z.w,
        h: z.h,
        turned: false,
      }
    const area = seats.find((s) => s.seat === ref.seat)!
    const x = area.turned ? area.w - z.x - z.w : z.x
    const y = area.turned ? area.h - z.y - z.h : z.y
    return {
      ...ref,
      key: zoneKey(z.id, ref.seat),
      x: area.x + x,
      y: area.y + y,
      w: z.w,
      h: z.h,
      turned: area.turned,
    }
  })
  return { w, h, zones, seats }
}

/**
 * A grid slot's rectangle inside its placed zone (zone-local mm). A turned
 * seat's grid is rotated too, so its first row faces the other player.
 */
export function slotRect(z: ZoneDef, slot: number, turned: boolean) {
  const rows = z.rows ?? 1
  const cols = z.cols ?? 1
  let r = rowOf(z, slot)
  let c = colOf(z, slot)
  if (turned) {
    r = rows - 1 - r
    c = cols - 1 - c
  }
  const w = z.w / cols
  const h = z.h / rows
  return { x: c * w, y: r * h, w, h }
}

/** Problems that would stop a setup from working (empty when fine). */
export function validateSetup(s: GameSetup): string[] {
  const errors: string[] = []
  if (!s.name.trim()) errors.push('The setup needs a name.')
  if (s.seats.length < 1 || s.seats.length > 4) errors.push('A game has 1 to 4 players.')
  if (!s.cardStates.length) errors.push('There must be at least one card state.')
  const ids = new Set<string>()
  for (const z of s.zones) {
    if (ids.has(z.id)) errors.push(`Two zones share the id "${z.id}".`)
    ids.add(z.id)
    if (z.w <= 0 || z.h <= 0) errors.push(`Zone "${z.name}" has no size.`)
    if (z.kind === 'grid' && (!(z.rows! >= 1) || !(z.cols! >= 1)))
      errors.push(`Grid "${z.name}" needs at least one row and one column.`)
    const area = z.perSeat ? s.seatArea : s.sharedArea
    if (z.x < 0 || z.y < 0 || z.x + z.w > area.w + 0.01 || z.y + z.h > area.h + 0.01)
      errors.push(`Zone "${z.name}" is outside its ${z.perSeat ? 'seat area' : 'shared area'}.`)
  }
  if (s.deal) {
    const dz = s.zones.find((z) => z.id === s.deal!.zoneId)
    if (!dz) errors.push('The deal zone does not exist.')
    else if (!dz.perSeat) errors.push('Decks must be dealt to a zone each player has.')
    const rs = s.deal.randomSetup
    if (rs) {
      const rz = s.zones.find((z) => z.id === rs.zoneId)
      if (!rz?.perSeat) errors.push('Random setup must fill a zone each player has.')
    }
  }
  return errors
}

// ─── Presets ───────────────────────────────────────────────────────────────

const GAP = 4
/** Room above each zone for its name (zone names are drawn just above the zone). */
export const LABEL = 6

/**
 * Adventure Scuffle! (Mutual Reveal mode): per player a 2 × 3 field, Support
 * and a Rest zone; four card states; a Main Attacker cube; points to 4.
 * Sized from the card size so any card fits, also when turned sideways.
 */
export function adventureScuffle(card: Size): GameSetup {
  const cell = Math.max(card.w, card.h) + GAP
  const fieldW = cell * 3
  const fieldH = cell * 2
  const sideW = Math.max(card.w, card.h) + GAP * 2
  const supportH = card.h + GAP * 2
  const seatW = fieldW + GAP * 3 + sideW
  const seatH = LABEL + fieldH + GAP + LABEL + supportH + GAP
  return {
    id: 'preset:adventure-scuffle',
    name: 'Adventure Scuffle! — Mutual Reveal',
    version: 1,
    seats: [
      { name: 'Player 1', color: '#2563eb' },
      { name: 'Player 2', color: '#dc2626' },
    ],
    seatLayout: 'facing',
    seatArea: { w: seatW, h: seatH },
    sharedArea: { w: seatW, h: 10 },
    zones: [
      {
        id: 'field',
        name: 'Field',
        kind: 'grid',
        perSeat: true,
        x: GAP,
        y: LABEL,
        w: fieldW,
        h: fieldH,
        rows: 2,
        cols: 3,
        rowNames: ['Front Line', 'Rear Guard'],
        colNames: ['Flank (left)', 'Center', 'Flank (right)'],
        visibility: 'public',
        face: 'down',
        capacity: 1,
      },
      {
        id: 'rest',
        name: 'Rest zone',
        kind: 'stack',
        perSeat: true,
        x: GAP * 2 + fieldW,
        y: LABEL,
        w: sideW,
        h: fieldH,
        visibility: 'public',
        face: 'up',
      },
      {
        id: 'support',
        name: 'Support',
        kind: 'row',
        perSeat: true,
        x: GAP,
        y: LABEL + fieldH + GAP + LABEL,
        w: seatW - GAP * 2,
        h: supportH,
        visibility: 'owner',
        face: 'down',
      },
    ],
    cardStates: [
      { id: 'ready', name: 'Ready', rotation: 0 },
      { id: 'attacking', name: 'Attacking', rotation: 90 },
      { id: 'defending', name: 'Defending', rotation: -90 },
      { id: 'ability', name: 'Ability-active', rotation: 45 },
    ],
    tokens: [
      {
        id: 'main-attacker',
        name: 'Main Attacker',
        shape: 'cube',
        color: 'seat',
        perSeat: true,
        count: 1,
        sizeMm: 12,
      },
    ],
    counters: [{ id: 'points', name: 'Points', perSeat: true, min: 0, max: 4, start: 0, winAt: 4 }],
    phases: ['Skirmish', 'Combat', 'Regroup'],
    initiative: true,
    initiativeName: 'Initiative',
    coin: true,
    dice: [],
    deal: { zoneId: 'support', deckSize: 12, randomSetup: { zoneId: 'field', count: 6 } },
  }
}

/** A plain board game table: a shared board area, per player a hand and a pile, dice and pawns. */
export function simpleBoard(card: Size): GameSetup {
  const board = 240
  const handH = card.h + GAP * 2
  const pileW = Math.max(card.w, card.h) + GAP * 2
  const seatW = board
  return {
    id: 'preset:simple-board',
    name: 'Simple board game',
    version: 1,
    seats: [
      { name: 'Player 1', color: '#2563eb' },
      { name: 'Player 2', color: '#dc2626' },
    ],
    seatLayout: 'facing',
    seatArea: { w: seatW, h: LABEL + handH + GAP },
    sharedArea: { w: board, h: LABEL + board * 0.75 + GAP },
    zones: [
      {
        id: 'board',
        name: 'Board',
        kind: 'area',
        perSeat: false,
        x: 0,
        y: LABEL,
        w: board,
        h: board * 0.75,
        visibility: 'public',
        face: 'up',
      },
      {
        id: 'hand',
        name: 'Hand',
        kind: 'row',
        perSeat: true,
        x: 0,
        y: LABEL,
        w: seatW - pileW - GAP,
        h: handH,
        visibility: 'owner',
        face: 'up',
      },
      {
        id: 'deck',
        name: 'Deck',
        kind: 'stack',
        perSeat: true,
        x: seatW - pileW,
        y: LABEL,
        w: pileW,
        h: handH,
        visibility: 'hidden',
        face: 'down',
      },
    ],
    cardStates: [
      { id: 'upright', name: 'Upright', rotation: 0 },
      { id: 'turned', name: 'Turned', rotation: 90 },
    ],
    tokens: [
      {
        id: 'pawn',
        name: 'Pawn',
        shape: 'pawn',
        color: 'seat',
        perSeat: true,
        count: 4,
        sizeMm: 10,
      },
      {
        id: 'marker',
        name: 'Marker',
        shape: 'disc',
        color: '#f59e0b',
        perSeat: false,
        count: 6,
        sizeMm: 8,
      },
    ],
    counters: [{ id: 'score', name: 'Score', perSeat: true, min: 0, max: 99, start: 0 }],
    phases: [],
    initiative: true,
    initiativeName: 'First player',
    coin: false,
    dice: [{ id: 'd6', name: '2d6', count: 2, sides: 6 }],
    deal: { zoneId: 'deck' },
  }
}

/** Built-in setups, sized for the project's cards. */
export const presets = (card: Size): GameSetup[] => [adventureScuffle(card), simpleBoard(card)]

/** The same setup with its picture and card references renamed (for a copied project). */
export function remapSetup(s: GameSetup, asset: (id: Id) => Id, card: (id: Id) => Id): GameSetup {
  return {
    ...s,
    zones: s.zones.map((z) =>
      z.background
        ? {
            ...z,
            background: {
              ...(z.background.assetId && { assetId: asset(z.background.assetId) }),
              ...(z.background.cardId && { cardId: card(z.background.cardId) }),
            },
          }
        : z,
    ),
    tokens: s.tokens.map((t) => (t.assetId ? { ...t, assetId: asset(t.assetId) } : t)),
  }
}
