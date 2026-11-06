import {
  CENTER,
  KIND_NAME,
  other,
  type Dir,
  type Piece,
  type Seat,
  type UwCard,
  type UwMove,
  type UwState,
} from './state'

/** Urban Warfare rules: legal moves and applying them. Rules: `game/urban-warfare/rulebook.md`. */

const DELTA: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
}
export const DIRS: Dir[] = ['up', 'down', 'left', 'right']

/** The zone one step from `z` in `dir`, or null when that is off the field. */
export function step(z: number, dir: Dir): number | null {
  const [dr, dc] = DELTA[dir]
  const r = Math.floor(z / 3) + dr
  const c = (z % 3) + dc
  return r < 0 || r > 2 || c < 0 || c > 2 ? null : r * 3 + c
}

export const neighbours = (z: number) =>
  DIRS.map((d) => step(z, d)).filter((n): n is number => n !== null)

/** Directions a card placed on zone `z` may push (inward). Empty for the center. */
export function placeDirs(z: number): Dir[] {
  if (z === CENTER) return []
  const r = Math.floor(z / 3)
  const c = z % 3
  const out: Dir[] = []
  if (r === 0) out.push('down')
  if (r === 2) out.push('up')
  if (c === 0) out.push('right')
  if (c === 2) out.push('left')
  return out
}

/** A card's firepower where it stands: printed plus 2 per adjacent own Logistics Mech. */
export function strength(field: (Piece | null)[], z: number): number {
  const p = field[z]
  if (!p) return 0
  let fp = p.card.fp
  for (const n of neighbours(z)) {
    const q = field[n]
    if (q && q.owner === p.owner && q.card.kind === 'support') fp += 2
  }
  return fp
}

/**
 * Can a card of `owner` with firepower `fp` push the line starting at `to` in `dir`?
 * Each card pushes the next one: a card of the same side goes freely, an enemy card
 * needs the pushing card's firepower to be equal or higher (Logistics bonuses count).
 */
function canPush(field: (Piece | null)[], owner: Seat, fp: number, to: number, dir: Dir): boolean {
  let z: number | null = to
  let side = owner
  let power = fp
  while (z !== null && field[z]) {
    const p: Piece = field[z]!
    const s = strength(field, z)
    if (p.owner !== side && power < s) return false
    side = p.owner
    power = s
    z = step(z, dir)
  }
  return true
}

/** Shift the line starting at `to` one zone in `dir`; the last card may fall off. Returns removed pieces. */
function shift(field: (Piece | null)[], to: number, dir: Dir): Piece[] {
  const line: number[] = []
  let z: number | null = to
  while (z !== null && field[z]) {
    line.push(z)
    z = step(z, dir)
  }
  const removed: Piece[] = []
  for (let i = line.length - 1; i >= 0; i--) {
    const from = line[i]
    const dest = step(from, dir)
    if (dest === null) removed.push(field[from]!)
    else field[dest] = field[from]
    field[from] = null
  }
  return removed
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
]

export function hasBattleline(field: (Piece | null)[], seat: Seat): boolean {
  return LINES.some((l) =>
    l.every((z) => field[z]?.owner === seat && field[z]?.card.kind === 'flag'),
  )
}

/** Attrition totals: field firepower with bonuses, the center counting double. */
export function scores(field: (Piece | null)[]): [number, number] {
  const out: [number, number] = [0, 0]
  field.forEach((p, z) => {
    if (p) out[p.owner] += strength(field, z) * (z === CENTER ? 2 : 1)
  })
  return out
}

export function createGame(hands: [UwCard[], UwCard[]], first: Seat): UwState {
  return {
    field: Array(9).fill(null),
    hands: [hands[0].slice(), hands[1].slice()],
    turn: first,
    first,
    turnsTaken: [0, 0],
    placementsLeft: 1,
    passes: 0,
    discard: [[], []],
    centerHold: null,
    winner: null,
    reason: null,
    log: [`Player ${first + 1} goes first.`],
  }
}

/** Every legal move. Hand cards of the same kind and firepower are merged (one move each). */
export function legalMoves(s: UwState): UwMove[] {
  if (s.winner !== null) return []
  const me = s.turn
  const moves: UwMove[] = []
  const seen = new Set<string>()
  const firstTurn = s.turnsTaken[me] === 0
  for (const c of s.hands[me]) {
    if (c.kind === 'bomb') {
      // Fighter-Bomber: an action from the hand, never placed.
      if (firstTurn || moves.some((m) => m.type === 'bomb')) continue
      for (let z = 0; z < 9; z++)
        if (s.field[z] && s.field[z]!.owner !== me)
          moves.push({ type: 'bomb', card: c.id, target: z })
      continue
    }
    const key = `${c.kind}:${c.fp}`
    if (seen.has(key)) continue
    seen.add(key)
    for (let z = 0; z < 9; z++) {
      if (z === CENTER) continue
      if (!s.field[z]) moves.push({ type: 'place', card: c.id, zone: z })
      else
        for (const dir of placeDirs(z))
          if (canPush(s.field, me, c.fp, z, dir))
            moves.push({ type: 'place', card: c.id, zone: z, dir })
    }
  }
  if (firstTurn) return moves
  for (let z = 0; z < 9; z++) {
    const p = s.field[z]
    if (!p || p.owner !== me) continue
    const fp = strength(s.field, z)
    for (const dir of DIRS) {
      const to = step(z, dir)
      if (to === null || canPush(s.field, me, fp, to, dir))
        moves.push({ type: 'move', from: z, dir })
    }
  }
  moves.push({ type: 'pass' })
  return moves
}

const zoneName = (z: number) => `zone ${z + 1}`

export function isLegal(s: UwState, m: UwMove): boolean {
  const legal = legalMoves(s)
  if (m.type === 'place') {
    const card = s.hands[s.turn].find((c) => c.id === m.card)
    if (!card) return false
    return legal.some((l) => {
      if (l.type !== 'place' || l.zone !== m.zone || l.dir !== m.dir) return false
      const lc = s.hands[s.turn].find((c) => c.id === l.card)!
      return lc.kind === card.kind && lc.fp === card.fp
    })
  }
  if (m.type === 'bomb') {
    const card = s.hands[s.turn].find((c) => c.id === m.card)
    return card?.kind === 'bomb' && legal.some((l) => l.type === 'bomb' && l.target === m.target)
  }
  return legal.some((l) => JSON.stringify(l) === JSON.stringify(m))
}

function clone(s: UwState): UwState {
  return {
    ...s,
    field: s.field.slice(),
    hands: [s.hands[0].slice(), s.hands[1].slice()],
    turnsTaken: [s.turnsTaken[0], s.turnsTaken[1]],
    discard: [s.discard[0].slice(), s.discard[1].slice()],
    centerHold: s.centerHold ? { ...s.centerHold } : null,
    log: s.log.slice(),
  }
}

/** Apply a legal move and return the new state (the old one is untouched). Throws on an illegal move. */
export function apply(prev: UwState, m: UwMove): UwState {
  if (!isLegal(prev, m)) throw new Error(`Illegal move: ${JSON.stringify(m)}`)
  const s = clone(prev)
  const me = s.turn
  const who = `P${me + 1}`
  const gone = (removed: Piece[]) =>
    removed.forEach((p) => s.log.push(`P${p.owner + 1}'s ${p.card.name} is pushed off the field.`))

  if (m.type === 'place') {
    const i = s.hands[me].findIndex((c) => c.id === m.card)
    const [card] = s.hands[me].splice(i, 1)
    if (s.field[m.zone]) gone(shift(s.field, m.zone, m.dir!))
    s.field[m.zone] = { card, owner: me }
    s.log.push(
      `${who} places ${card.name} on ${zoneName(m.zone)}${m.dir ? `, pushing ${m.dir}` : ''}.`,
    )
    s.passes = 0
    s.placementsLeft -= 1
    if (s.placementsLeft > 0) return s
  } else if (m.type === 'move') {
    const piece = s.field[m.from]!
    const to = step(m.from, m.dir)
    s.field[m.from] = null
    if (to === null) {
      s.log.push(`${who} moves ${piece.card.name} off the field.`)
    } else {
      if (s.field[to]) gone(shift(s.field, to, m.dir))
      s.field[to] = piece
      s.log.push(`${who} moves ${piece.card.name} ${m.dir} to ${zoneName(to)}.`)
    }
    s.passes = 0
  } else if (m.type === 'bomb') {
    const i = s.hands[me].findIndex((c) => c.id === m.card)
    const [bomber] = s.hands[me].splice(i, 1)
    s.discard[me].push(bomber)
    const t = s.field[m.target]!
    s.field[m.target] = null
    s.log.push(
      `${who}'s ${bomber.name} bombs P${t.owner + 1}'s ${t.card.name} on ${zoneName(m.target)}.`,
    )
    s.passes = 0
  } else {
    s.passes += 1
    s.log.push(`${who} passes.`)
  }
  endTurn(s)
  return s
}

function endTurn(s: UwState) {
  const me = s.turn
  const opp = other(me)
  s.turnsTaken[me] += 1
  // 1. Battleline: checked when the opponent of the line's owner ends a turn.
  if (hasBattleline(s.field, opp)) return win(s, opp, 'battleline')
  // 2. The center count.
  const c = s.field[CENTER]
  if (!c) s.centerHold = null
  else if (!s.centerHold || s.centerHold.seat !== c.owner)
    s.centerHold = { seat: c.owner, oppTurns: 0 }
  else if (s.centerHold.seat !== me) s.centerHold.oppTurns += 1
  // 3. Attrition.
  if ((s.hands[0].length === 0 && s.hands[1].length === 0) || s.passes >= 2) {
    const [a, b] = scores(s.field)
    s.log.push(`Attrition: P1 ${a}, P2 ${b}.`)
    if (a !== b) return win(s, a > b ? 0 : 1, 'attrition')
    if (c) return win(s, c.owner, 'attrition')
    s.winner = 'draw'
    s.reason = 'attrition'
    s.log.push('The game is a draw.')
    return
  }
  // 4. Next turn; the objective win comes at its start.
  s.turn = opp
  s.placementsLeft = s.turnsTaken[opp] === 0 && opp !== s.first ? 2 : 1
  if (s.centerHold && s.centerHold.seat === opp && s.centerHold.oppTurns >= 2)
    win(s, opp, 'objective')
}

function win(s: UwState, seat: Seat, reason: 'battleline' | 'objective' | 'attrition') {
  s.winner = seat
  s.reason = reason
  const why =
    reason === 'battleline'
      ? `${KIND_NAME.flag}s in a row`
      : reason === 'objective'
        ? 'held the center'
        : 'more firepower'
  s.log.push(`Player ${seat + 1} wins (${why}).`)
}
