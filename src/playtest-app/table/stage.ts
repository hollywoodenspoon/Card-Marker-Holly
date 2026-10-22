import type { AsState, Engagement, Seat } from '@/adventure/state'
import { other } from '@/adventure/state'
import { engagementSides, engagementTotals, type Totals } from '@/adventure/stats'
import { pieceId } from '@/adventure/table'

/**
 * The combat stage: an Engagement's cards stacked so their values can be
 * counted. The Main Attacker stands upright; the other attackers that count
 * lie sideways behind it (turned clockwise: their sword edge shows). The
 * defenders that count all lie sideways the other way (shield edge showing).
 * Fighting Spirit cards stand beside their side's stack, the newest in front,
 * older ones stepping up behind (flame edge showing).
 */

/** How much of a sideways card shows above the one in front, as a share of the card width. */
export const STRIP = 0.25
/** How much of an older Fighting Spirit card shows above the newer one, as a share of its height. */
export const FS_STRIP = 0.2
/** Gap between a stack and its Fighting Spirit cards, as a share of the card width. */
const FS_GAP = 0.08

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
  const mainCard = main === null ? null : atkField[main].card
  const others = (sides?.attackers ?? []).filter((i) => i !== main).map((i) => atkField[i].card!)
  const defenders = (sides?.defenders ?? []).map((i) => defField[i].card!)
  return {
    names: [s.players[0].name, s.players[1].name],
    attacker: e.attacker,
    atk: group(e.attacker, mainCard, others, 90, e.fs[e.attacker], w, h),
    def: group(def, null, defenders, -90, e.fs[def], w, h),
    totals: engagementTotals(s, e),
  }
}

function group(
  seat: Seat,
  front: string | null,
  sideways: string[],
  rotation: 90 | -90,
  fs: Engagement['fs'][number],
  w: number,
  h: number,
): StageGroup {
  const cards: StageCard[] = []
  // Sideways cards are h wide and w tall; each one shows a strip above the next.
  const strip = STRIP * w
  const stackW = sideways.length ? h : w
  const above = sideways.length ? (front ? sideways.length : sideways.length - 1) * strip : 0
  const frontH = front ? h : sideways.length ? w : 0
  const stackH = above + frontH
  const bottom = stackH
  if (front)
    cards.push({
      id: pieceId(seat, front),
      card: front,
      kind: 'main',
      cx: stackW / 2,
      cy: bottom - h / 2,
      rotation: 0,
      z: 100,
    })
  // The nearest sideways card sits right behind the front one (or is the front).
  sideways.forEach((card, k) => {
    const top = front ? bottom - h - (k + 1) * strip : bottom - w - k * strip
    cards.push({
      id: pieceId(seat, card),
      card,
      kind: front ? 'attacker' : 'defender',
      cx: stackW / 2,
      cy: top + w / 2,
      rotation,
      z: 99 - k,
    })
  })
  // Fighting Spirit beside the stack: newest in front at the bottom.
  const fsX = fs.length ? stackW + FS_GAP * w + w / 2 : 0
  const fsH = fs.length ? h + (fs.length - 1) * FS_STRIP * h : 0
  const height = Math.max(stackH, fsH)
  const shift = height - stackH
  for (const c of cards) c.cy += shift
  ;[...fs].reverse().forEach((f, k) => {
    cards.push({
      id: pieceId(seat, f.card),
      card: f.card,
      kind: 'fs',
      cx: fsX,
      cy: height - h / 2 - k * FS_STRIP * h,
      rotation: 0,
      z: 100 - k,
      value: f.value,
    })
  })
  return {
    seat,
    cards,
    w: fs.length ? fsX + w / 2 : stackW,
    h: height,
  }
}
