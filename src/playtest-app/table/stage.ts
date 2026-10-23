import type { AsState, Engagement, Seat } from '@/adventure/state'
import { other } from '@/adventure/state'
import { engagementSides, engagementTotals, type Totals } from '@/adventure/stats'
import { fsPreview, restFsCards } from '@/adventure/engine'
import { pieceId } from '@/adventure/table'

/**
 * The combat stage: an Engagement's cards stacked so their values can be
 * counted. As on the table, every Active card lies sideways: the attackers
 * that count turned clockwise (sword edge up), the Main Attacker in front and
 * the others stepping up behind it; the defenders that count turned the other
 * way (shield edge up). Fighting Spirit cards stand upright in front of their
 * side's stack, below its strips, the newest lowest and in front (an older
 * one's flame edge shows above it).
 */

/** How much of a sideways card shows above the one in front, as a share of the card width. */
export const STRIP = 0.25
/** How much of an older Fighting Spirit card shows above the newer one, as a share of its height. */
export const FS_STRIP = 0.2

export interface StageCard {
  id: string
  card: string
  kind: 'main' | 'attacker' | 'defender' | 'fs'
  /** Centre, in the same units as the card size; the group's top left is 0, 0. */
  cx: number
  cy: number
  rotation: 0 | 90 | -90
  z: number
  /** Fighting Spirit: its value as revealed. */
  value?: number
  /** Fighting Spirit: used from the rest zone (it stays there). */
  fromRest?: boolean
}

export interface StageGroup {
  seat: Seat
  cards: StageCard[]
  w: number
  h: number
}

export interface Stage {
  /** The players' names in the game. */
  names: [string, string]
  attacker: Seat
  atk: StageGroup
  def: StageGroup
  totals: Totals
  /** Rest-zone cards each player could use for Fighting Spirit now, with their value. */
  rest: [RestOption[], RestOption[]]
  /** Cards left in each player's Support (their hand). */
  hand: [number, number]
  passed: [boolean, boolean]
  /** Whose Fighting Spirit turn it is (null: neither's). */
  turn: Seat | null
}

export interface RestOption {
  id: string
  card: string
  /** null: decided by a coin. */
  value: number | null
}

/** The line that ends an Engagement, or the score after it: the stage stays up for these. */
const AFTERMATH = /^(Attack \d+ vs Defense \d+:|No defender is on|Points: )/

/**
 * The Engagement to show at frame `i`: the one being fought, or the one that
 * just ended while its result lines are on screen. Returns the frame whose
 * board the stage is drawn from.
 */
export function stageFrame(frames: AsState[], i: number): { s: AsState; e: Engagement } | null {
  const s = frames[i]
  if (!s) return null
  if (s.engagement) return { s, e: s.engagement }
  for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
    const line = frames[j + 1].log.at(-1)?.text ?? ''
    if (!AFTERMATH.test(line)) return null
    const e = frames[j].engagement
    if (e) return { s: frames[j], e }
  }
  return null
}

/** Card positions for an Engagement, for cards `size` big (portrait). */
export function stageLayout(s: AsState, e: Engagement, size: { w: number; h: number }): Stage {
  const { w, h } = size
  const sides = engagementSides(s, e.attacker)
  const def = other(e.attacker)
  const atkField = s.players[e.attacker].field
  const defField = s.players[def].field
  const main = sides?.main ?? null
  const others = (sides?.attackers ?? []).filter((i) => i !== main).map((i) => atkField[i].card!)
  // The Main Attacker is the front card of its stack.
  const attackers = main === null ? others : [atkField[main].card!, ...others]
  const defenders = (sides?.defenders ?? []).map((i) => defField[i].card!)
  return {
    names: [s.players[0].name, s.players[1].name],
    attacker: e.attacker,
    atk: group(e.attacker, attackers, main !== null, 90, e.fs[e.attacker], w, h),
    def: group(def, defenders, false, -90, e.fs[def], w, h),
    totals: engagementTotals(s, e),
    rest: [restOptions(s, 0), restOptions(s, 1)],
    hand: [s.players[0].support.length, s.players[1].support.length],
    passed: [e.passed[0], e.passed[1]],
    turn: s.step.k === 'fs' ? s.step.seat : null,
  }
}

/** A player's rest-zone Fighting Spirit cards usable now (rest zones are public). */
function restOptions(s: AsState, seat: Seat): RestOption[] {
  if (!s.engagement || s.engagement.passed[seat]) return []
  return restFsCards(s, seat).map((card) => ({
    id: pieceId(seat, card),
    card,
    value: fsPreview(s, seat, card, 'rest'),
  }))
}

/**
 * One side: `sideways` front card first. Sideways cards are h wide and w tall;
 * each one behind shows a strip above the next.
 */
function group(
  seat: Seat,
  sideways: string[],
  hasMain: boolean,
  rotation: 90 | -90,
  fs: Engagement['fs'][number],
  w: number,
  h: number,
): StageGroup {
  const cards: StageCard[] = []
  const strip = STRIP * w
  const n = sideways.length
  const width = n ? h : w
  // The front card's top, below the strips of the cards behind it.
  const frontTop = n ? (n - 1) * strip : 0
  sideways.forEach((card, k) => {
    cards.push({
      id: pieceId(seat, card),
      card,
      kind: k === 0 && hasMain ? 'main' : hasMain ? 'attacker' : 'defender',
      cx: width / 2,
      cy: frontTop - k * strip + w / 2,
      rotation,
      z: 50 - k,
    })
  })
  // Fighting Spirit in front, below the front card's strip: the oldest highest.
  const fsTop = n ? frontTop + strip : 0
  fs.forEach((f, k) => {
    cards.push({
      id: pieceId(seat, f.card),
      card: f.card,
      kind: 'fs',
      cx: width / 2,
      cy: fsTop + k * FS_STRIP * h + h / 2,
      rotation: 0,
      z: 60 + k,
      value: f.value,
      fromRest: f.from === 'rest',
    })
  })
  const stackBottom = n ? frontTop + w : 0
  const fsBottom = fs.length ? fsTop + (fs.length - 1) * FS_STRIP * h + h : 0
  return { seat, cards, w: width, h: Math.max(stackBottom, fsBottom) }
}
