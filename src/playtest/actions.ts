import { produce, type Draft } from 'immer'
import { nextInt, shuffle } from './rng'
import { parseZoneKey, slotName, zoneKey, type GameSetup, type ZoneDef } from './setup'
import { locate, piecesIn, type Piece, type TableState, type TokenAt } from './state'

/**
 * Everything that can happen at the table, as plain data. `applyAction` is a
 * pure function, so a list of actions replays a game exactly: that gives undo,
 * the game log, and later a rules engine (which actions are legal) and an AI
 * (simulating games) without changing the table.
 */
export type TableAction =
  | { t: 'move'; piece: string; to: Target; face?: 'up' | 'down' }
  | { t: 'swap'; a: string; b: string }
  | { t: 'flip'; piece: string }
  | { t: 'state'; piece: string; state: string }
  | { t: 'token'; token: string; to: TokenAt }
  | { t: 'counter'; key: string; delta: number }
  | { t: 'shuffle'; zone: string }
  | { t: 'pick'; zone: string }
  | { t: 'coin' }
  | { t: 'roll'; dice: string }
  | { t: 'phase'; delta: 1 | -1 }
  | { t: 'initiative'; seat: number }
  | { t: 'randomSetup'; seat?: number }
  | { t: 'resetStates'; seat?: number }
  | { t: 'note'; text: string }

/** Where a piece goes: a zone, and a slot (grid), position in the row/stack, or spot (area). */
export interface Target {
  zone: string
  slot?: number
  index?: number
  x?: number
  y?: number
}

const zoneOf = (setup: GameSetup, key: string): ZoneDef | undefined =>
  setup.zones.find((z) => z.id === parseZoneKey(key).zoneId)

const seatName = (setup: GameSetup, seat: number | null) =>
  seat === null ? 'Table' : (setup.seats[seat]?.name ?? `Player ${seat + 1}`)

/** "Player 1's Field, Front Line Center" */
export function placeName(setup: GameSetup, key: string, slot?: number) {
  const { seat } = parseZoneKey(key)
  const z = zoneOf(setup, key)
  if (!z) return key
  const where = seat === null ? z.name : `${seatName(setup, seat)}'s ${z.name}`
  return slot === undefined || z.kind !== 'grid' ? where : `${where}, ${slotName(z, slot)}`
}

/** A piece's name as everyone may know it. */
const shown = (p: Piece) => (p.faceUp ? p.name : 'a face-down card')

/** Take a piece off the table (returns where it was). */
function lift(d: Draft<TableState>, id: string) {
  const at = locate(d as TableState, id)
  if (!at) return null
  const zc = d.zones[at.key]
  if (zc.slots) zc.slots[at.slot!].splice(at.index, 1)
  else {
    zc.items!.splice(at.index, 1)
    if (zc.pos) delete zc.pos[id]
  }
  return at
}

function put(d: Draft<TableState>, z: ZoneDef, id: string, to: Target) {
  const zc = d.zones[to.zone]
  if (zc.slots) zc.slots[to.slot ?? 0].push(id)
  else {
    const items = zc.items!
    items.splice(Math.min(to.index ?? items.length, items.length), 0, id)
    if (zc.pos) zc.pos[id] = { x: to.x ?? z.w / 2, y: to.y ?? z.h / 2 }
  }
}

/** Entering a zone: its face rule; piles and hands hold pieces in their normal state, without tokens. */
function enter(
  setup: GameSetup,
  d: Draft<TableState>,
  z: ZoneDef,
  id: string,
  face?: 'up' | 'down',
) {
  const p = d.pieces[id]
  const rule = face ?? z.face
  if (rule !== 'keep') p.faceUp = rule === 'up'
  if (z.kind === 'stack' || z.kind === 'row') {
    p.state = setup.cardStates[0]?.id ?? p.state
    for (const t of Object.values(d.tokens))
      if ('piece' in t.at && t.at.piece === id) t.at = { pool: true }
  }
}

const capacity = (z: ZoneDef) => (z.kind === 'grid' ? (z.capacity ?? 1) : (z.capacity ?? Infinity))

function log(d: Draft<TableState>, text: string) {
  d.log.push({ n: (d.log.at(-1)?.n ?? 0) + 1, text })
}

function checkWin(setup: GameSetup, d: Draft<TableState>) {
  if (d.winner) return
  for (const c of setup.counters) {
    if (c.winAt === undefined) continue
    const seats = c.perSeat ? setup.seats.map((_, i) => i) : [null]
    for (const seat of seats)
      if ((d.counters[zoneKey(c.id, seat)] ?? c.start) >= c.winAt) {
        d.winner = { seat, reason: `${c.name} reached ${c.winAt}` }
        log(d, `${seatName(setup, seat)} wins (${c.name} ${c.winAt}).`)
        return
      }
  }
}

/** Move a piece; landing on a full slot swaps with what is there. */
function move(
  setup: GameSetup,
  d: Draft<TableState>,
  id: string,
  to: Target,
  face?: 'up' | 'down',
) {
  const z = zoneOf(setup, to.zone)
  const p = d.pieces[id]
  if (!z || !p || !d.zones[to.zone]) return
  const from = locate(d as TableState, id)
  const zc = d.zones[to.zone]
  const sameZone = from?.key === to.zone
  if (sameZone && zc.slots && from!.slot === to.slot) return
  const occupants = zc.slots ? zc.slots[to.slot ?? 0] : zc.items!
  if (occupants.length >= capacity(z) && !(sameZone && !zc.slots)) {
    const other = zc.slots ? occupants.at(-1) : undefined
    if (other && from) swap(setup, d, id, other)
    return
  }
  const before = shown(p)
  lift(d, id)
  // Indices were counted with the piece still in its row.
  if (sameZone && to.index !== undefined && from!.index < to.index)
    to = { ...to, index: to.index - 1 }
  put(d, z, id, to)
  // Moving inside a zone keeps the piece the way up it was.
  if (!sameZone) enter(setup, d, z, id, face)
  else if (face) p.faceUp = face === 'up'
  const name = p.faceUp ? p.name : before
  log(d, `${name} → ${placeName(setup, to.zone, to.slot)}`)
}

function swap(setup: GameSetup, d: Draft<TableState>, a: string, b: string) {
  const la = locate(d as TableState, a)
  const lb = locate(d as TableState, b)
  if (!la || !lb || a === b) return
  const ca = d.zones[la.key]
  const cb = d.zones[lb.key]
  const pa = ca.pos?.[a]
  const pb = cb.pos?.[b]
  const listA = ca.slots ? ca.slots[la.slot!] : ca.items!
  const listB = cb.slots ? cb.slots[lb.slot!] : cb.items!
  listA[la.index] = b
  listB[lb.index] = a
  if (ca.pos) {
    delete ca.pos[a]
    ca.pos[b] = pa!
  }
  if (cb.pos) {
    delete cb.pos[b]
    cb.pos[a] = pb!
  }
  if (la.key !== lb.key) {
    enter(setup, d, zoneOf(setup, lb.key)!, a)
    enter(setup, d, zoneOf(setup, la.key)!, b)
  }
  log(
    d,
    `Swapped ${shown(d.pieces[a])} (${placeName(setup, lb.key, lb.slot)}) and ${shown(d.pieces[b])} (${placeName(setup, la.key, la.slot)})`,
  )
}

function randomSetup(setup: GameSetup, d: Draft<TableState>, seat: number) {
  const rs = setup.deal?.randomSetup
  if (!rs) return
  const from = zoneKey(setup.deal!.zoneId, seat)
  const to = zoneKey(rs.zoneId, seat)
  const z = zoneOf(setup, to)!
  const zc = d.zones[to]
  let picks: string[]
  ;[picks, d.seed] = shuffle(piecesIn(d as TableState, from), d.seed)
  picks = picks.slice(0, rs.count)
  if (zc.slots) {
    let free = zc.slots.map((_, i) => i).filter((i) => zc.slots![i].length < capacity(z))
    ;[free, d.seed] = shuffle(free, d.seed)
    picks = picks.slice(0, free.length)
    picks.forEach((id, i) => {
      lift(d, id)
      put(d, z, id, { zone: to, slot: free[i] })
      enter(setup, d, z, id)
    })
  } else
    for (const id of picks) {
      lift(d, id)
      put(d, z, id, { zone: to })
      enter(setup, d, z, id)
    }
  log(d, `Random setup: ${picks.length} cards to ${placeName(setup, to)}`)
}

/** Apply one action (returns the same state object when nothing changes). */
export function applyAction(setup: GameSetup, state: TableState, a: TableAction): TableState {
  return produce(state, (d) => {
    switch (a.t) {
      case 'move':
        return void move(setup, d, a.piece, a.to, a.face)
      case 'swap':
        return void swap(setup, d, a.a, a.b)
      case 'flip': {
        const p = d.pieces[a.piece]
        if (!p) return
        p.faceUp = !p.faceUp
        const at = locate(d as TableState, a.piece)
        const where = at ? ` (${placeName(setup, at.key, at.slot)})` : ''
        return void log(
          d,
          p.faceUp ? `Revealed ${p.name}${where}` : `Turned ${p.name} face down${where}`,
        )
      }
      case 'state': {
        const p = d.pieces[a.piece]
        const def = setup.cardStates.find((s) => s.id === a.state)
        if (!p || !def || p.state === a.state) return
        p.state = a.state
        return void log(d, `${shown(p)}: ${def.name}`)
      }
      case 'token': {
        const t = d.tokens[a.token]
        if (!t) return
        t.at = a.to
        const def = setup.tokens.find((x) => x.id === t.tokenId)
        const owner = t.owner === null ? '' : `${seatName(setup, t.owner)}'s `
        const where =
          'pool' in a.to
            ? 'back to the tray'
            : 'piece' in a.to
              ? `on ${shown(d.pieces[a.to.piece])}`
              : `to ${placeName(setup, a.to.zone, a.to.slot)}`
        return void log(d, `${owner}${def?.name ?? 'Token'} ${where}`)
      }
      case 'counter': {
        const { zoneId, seat } = parseZoneKey(a.key)
        const def = setup.counters.find((c) => c.id === zoneId)
        if (!def) return
        const old = d.counters[a.key] ?? def.start
        const v = Math.min(def.max, Math.max(def.min, old + a.delta))
        if (v === old) return
        d.counters[a.key] = v
        log(d, `${seatName(setup, def.perSeat ? seat : null)}: ${def.name} ${v}`)
        return void checkWin(setup, d)
      }
      case 'shuffle': {
        const zc = d.zones[a.zone]
        if (!zc?.items || zc.items.length < 2) return
        ;[zc.items, d.seed] = shuffle(zc.items, d.seed)
        return void log(d, `Shuffled ${placeName(setup, a.zone)}`)
      }
      case 'pick': {
        const ids = piecesIn(d as TableState, a.zone)
        if (!ids.length) return
        let i: number
        ;[i, d.seed] = nextInt(d.seed, ids.length)
        d.last.picked = ids[i]
        return void log(
          d,
          `Random pick from ${placeName(setup, a.zone)}: ${shown(d.pieces[ids[i]])}`,
        )
      }
      case 'coin': {
        let v: number
        ;[v, d.seed] = nextInt(d.seed, 2)
        d.last.coin = v ? 'Heads' : 'Tails'
        return void log(d, `Coin: ${d.last.coin}`)
      }
      case 'roll': {
        const def = setup.dice.find((x) => x.id === a.dice)
        if (!def) return
        const values: number[] = []
        for (let i = 0; i < def.count; i++) {
          let v: number
          ;[v, d.seed] = nextInt(d.seed, def.sides)
          values.push(v + 1)
        }
        d.last.roll = { name: def.name, values }
        const sum = values.reduce((x, y) => x + y, 0)
        return void log(
          d,
          `Rolled ${def.name}: ${values.join(' + ')}${values.length > 1 ? ` = ${sum}` : ''}`,
        )
      }
      case 'phase': {
        const n = setup.phases.length
        if (!n) {
          if (a.delta < 0 && d.round <= 1) return
          d.round += a.delta
          return void log(d, `Round ${d.round}`)
        }
        let p = d.phase + a.delta
        if (p >= n) {
          p = 0
          d.round++
        } else if (p < 0) {
          if (d.round <= 1) return
          p = n - 1
          d.round--
        }
        d.phase = p
        return void log(d, `Round ${d.round}: ${setup.phases[p]}`)
      }
      case 'initiative': {
        if (a.seat === d.initiative || !setup.seats[a.seat]) return
        d.initiative = a.seat
        return void log(d, `${setup.initiativeName ?? 'Initiative'}: ${seatName(setup, a.seat)}`)
      }
      case 'randomSetup': {
        const seats = a.seat === undefined ? setup.seats.map((_, i) => i) : [a.seat]
        for (const seat of seats) randomSetup(setup, d, seat)
        return
      }
      case 'resetStates': {
        const first = setup.cardStates[0]
        if (!first) return
        let n = 0
        for (const p of Object.values(d.pieces))
          if ((a.seat === undefined || p.owner === a.seat) && p.state !== first.id) {
            p.state = first.id
            n++
          }
        if (n)
          log(
            d,
            `${a.seat === undefined ? 'All' : `${seatName(setup, a.seat)}'s`} cards: ${first.name}`,
          )
        return
      }
      case 'note':
        if (a.text.trim()) log(d, `Note: ${a.text.trim()}`)
        return
    }
  })
}

/** How a piece looks to a viewer: its face, its face but secret (only you know it), or its back. */
export type Seen = 'face' | 'peek' | 'back'

/** `viewer` null = everyone (playing all seats yourself). */
export function seenBy(
  setup: GameSetup,
  state: TableState,
  pieceId: string,
  viewer: number | null,
): Seen {
  const p = state.pieces[pieceId]
  if (!p) return 'back'
  if (p.faceUp) return 'face'
  const at = locate(state, pieceId)
  const z = at && zoneOf(setup, at.key)
  if (!z || z.visibility === 'hidden') return 'back'
  return viewer === null || viewer === p.owner ? 'peek' : 'back'
}

/**
 * The table as one seat may know it: pieces it can't see lose their card and
 * name. This is what a fair AI player is given.
 */
export function observe(setup: GameSetup, state: TableState, viewer: number): TableState {
  return produce(state, (d) => {
    for (const p of Object.values(d.pieces))
      if (seenBy(setup, state, p.id, viewer) === 'back') {
        p.cardId = ''
        p.name = 'a face-down card'
      }
    d.log = []
  })
}
