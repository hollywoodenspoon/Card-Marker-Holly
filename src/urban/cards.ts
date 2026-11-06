import type { PackCard, PackValue } from '@/playtest/pack'
import { KINDS, KIND_NAME, PER_PLAYER, type Kind, type UwCard } from './state'

/**
 * Urban Warfare cards, read from a pack's hidden `_UW` fields:
 * `Firepower_UW` (0–3), `Ability_UW` (flag, bomb, support, nil), optional `Name_UW`.
 */

export interface UwIssue {
  cardId: string
  name: string
  problem: string
}

export interface UwPackCard {
  packId: string
  name: string
  kind: Kind
  fp: number
}

const DEFAULT_FP: Record<Kind, number> = { flag: 2, nil: 3, support: 1, bomb: 0 }
const text = (v: PackValue | undefined) => (v === undefined ? '' : String(v).trim())

export const isUrbanPack = (cards: PackCard[]) => cards.some((c) => 'Ability_UW' in c.fields)

/** Read the pack's Urban Warfare cards. Cards without `Ability_UW` are skipped. */
export function cardsFromPack(cards: PackCard[]): { cards: UwPackCard[]; issues: UwIssue[] } {
  const issues: UwIssue[] = []
  const out: UwPackCard[] = []
  for (const c of cards) {
    if (!('Ability_UW' in c.fields)) continue
    const name = text(c.fields.Name_UW) || c.name
    const problem = (p: string) => issues.push({ cardId: c.id, name, problem: p })
    const ability = text(c.fields.Ability_UW).toLowerCase()
    const kind = KINDS.find((k) => k === ability)
    if (!kind) {
      problem(`Ability_UW "${ability}" is not flag, bomb, support or nil.`)
      continue
    }
    const raw = text(c.fields.Firepower_UW)
    let fp = DEFAULT_FP[kind]
    if (!/^\d+$/.test(raw)) problem(`Firepower_UW is missing or not a number (using ${fp}).`)
    else {
      fp = Number(raw)
      if (fp > 3) problem(`Firepower_UW ${fp} is outside 0–3.`)
    }
    out.push({ packId: c.id, name, kind, fp })
  }
  for (const k of KINDS)
    if (!out.some((c) => c.kind === k))
      issues.push({ cardId: '', name: KIND_NAME[k], problem: `No card has Ability_UW "${k}".` })
  return { cards: out, issues }
}

/** Kinds the pack has no card for (the game can't start without them). */
export const missingKinds = (cards: UwPackCard[]) =>
  KINDS.filter((k) => !cards.some((c) => c.kind === k))

/**
 * Deal both hands: 3 flag, 2 nil, 2 support, 2 bomb each. A kind's pack cards are
 * dealt in turn, so with fewer cards than needed, copies are used.
 */
export function deal(cards: UwPackCard[]): [UwCard[], UwCard[]] {
  const hands: [UwCard[], UwCard[]] = [[], []]
  for (const k of KINDS) {
    const of = cards.filter((c) => c.kind === k)
    if (of.length === 0) throw new Error(`No ${KIND_NAME[k]} card in the pack.`)
    for (let i = 0; i < PER_PLAYER[k] * 2; i++) {
      const seat = i % 2
      const src = of[i % of.length]
      const hand = hands[seat]
      hand.push({
        id: `p${seat}-${hand.length}`,
        packId: src.packId,
        name: src.name,
        kind: k,
        fp: src.fp,
      })
    }
  }
  return hands
}
