import type { PackCard, PackValue } from '@/playtest/pack'
import { unreadParts } from './effects/registry'

/**
 * Adventure Scuffle cards, read from a game pack's field values (the `_AS`
 * fields Hearthside Cardworks exports). Pure data: no React, no storage, so the
 * same reading can be ported to the Godot game.
 */

export const CARD_TYPES = ['Field', 'Battle', 'Flip', 'Support', 'Inherent', 'Rest'] as const
export type CardType = (typeof CARD_TYPES)[number]

export interface AsCard {
  /** The pack's card id (what decks and the table refer to). */
  id: string
  /** Stable card code such as "TFQ-01": card effects are looked up by it. */
  code: string
  /** Name without inline symbols such as {ace}. */
  name: string
  ace: boolean
  type: CardType | null
  fs: number
  a: number
  d: number
  /** Fate Number, 100–666, unique per card. */
  fate: number
  ability: string
  /** The group a card belongs to, e.g. a starter deck ("Adventurer's Guild"). */
  group: string
  /**
   * Archetypes from `Archetype_AS` (e.g. "Grave" or "Rianz, Hero"). Empty: the
   * card's archetypes come from its name (any word, as before).
   */
  archetypes: string[]
}

export interface CardIssue {
  cardId: string
  name: string
  problem: string
}

const text = (v: PackValue | undefined) => (v === undefined ? '' : String(v).trim())
/** Inline symbols in names, e.g. "Crimson Duelist {ace}". */
const SYMBOL = /\{[^{}]+\}/g
const cleanName = (s: string) => s.replace(SYMBOL, '').replace(/\s+/g, ' ').trim()

function num(v: PackValue | undefined): number | null {
  if (typeof v === 'number') return v
  const t = text(v)
  if (!/^-?\d+$/.test(t)) return null
  return Number(t)
}

/** Does this pack look like an Adventure Scuffle pack (cards with `_AS` stats)? */
export const isAdventurePack = (cards: PackCard[]) =>
  cards.some((c) => 'Fate_AS' in c.fields || 'A_AS' in c.fields || 'Code_AS' in c.fields)

/**
 * Read every card. Cards with missing or bad values are still returned (with
 * safe defaults) and listed in `issues`, so a half-finished set can be played.
 */
export function cardsFromPack(cards: PackCard[]): { cards: AsCard[]; issues: CardIssue[] } {
  const issues: CardIssue[] = []
  const out = cards.map((c): AsCard => {
    const f = c.fields
    const rawName = text(f.Name_AS) || c.name
    const name = cleanName(rawName) || c.name
    const problem = (p: string) => issues.push({ cardId: c.id, name, problem: p })
    const stat = (key: string, label: string, lo: number, hi: number) => {
      const n = num(f[key])
      if (n === null) {
        problem(`${label} (${key}) is missing or not a number.`)
        return 0
      }
      if (n < lo || n > hi) problem(`${label} ${n} is outside ${lo}–${hi}.`)
      return n
    }
    const typeText = text(f.Type_AS)
    const type = CARD_TYPES.find((t) => t.toLowerCase() === typeText.toLowerCase()) ?? null
    if (!type) problem(typeText ? `Unknown card type "${typeText}".` : 'Type (Type_AS) is missing.')
    const code = text(f.Code_AS)
    if (!code) problem('Card code (Code_AS) is missing.')
    return {
      id: c.id,
      code: code || c.id,
      name,
      ace: /\{ace\}/i.test(rawName),
      type,
      // No card's Fighting Spirit may exceed 3 (rulebook).
      fs: stat('FS_AS', 'Fighting Spirit', 0, 3),
      a: stat('A_AS', 'Attack', 0, 99),
      d: stat('D_AS', 'Defense', 0, 99),
      fate: stat('Fate_AS', 'Fate Number', 100, 666),
      ability: text(f.Ability_AS),
      group: text(f.Deck_AS),
      archetypes: archetypeList(text(f.Archetype_AS)),
    }
  })
  // Fate Numbers are unique: the Skirmish ranks cards by them.
  const byFate = new Map<number, AsCard[]>()
  for (const c of out) byFate.set(c.fate, [...(byFate.get(c.fate) ?? []), c])
  for (const [fate, same] of byFate)
    if (same.length > 1 && fate >= 100)
      for (const c of same)
        issues.push({
          cardId: c.id,
          name: c.name,
          problem: `Fate Number ${fate} is also used by ${same
            .filter((o) => o !== c)
            .map((o) => o.name)
            .join(', ')}.`,
        })
  const byCode = new Map<string, AsCard[]>()
  for (const c of out) byCode.set(c.code, [...(byCode.get(c.code) ?? []), c])
  for (const [code, same] of byCode)
    if (same.length > 1)
      for (const c of same)
        issues.push({ cardId: c.id, name: c.name, problem: `Card code ${code} is used twice.` })
  // The rules engine reads each ability from its text; a card it can't read plays with its stats.
  for (const c of out) {
    const unread = unreadParts(c)
    if (unread.length)
      issues.push({
        cardId: c.id,
        name: c.name,
        problem: `The rules engine can't read “${unread.join('”, “')}” in its ability, so it plays with its stats only.`,
      })
  }
  return { cards: out, issues }
}

/** "Grave, Ghoulish" or "Grave; Ghoulish" → ["Grave", "Ghoulish"]. */
export const archetypeList = (s: string) =>
  s
    .split(/[,;/]/)
    .map((x) => x.trim())
    .filter(Boolean)

/** Inline stat symbols as short text, for showing ability text outside a card picture. */
const SYMBOL_TEXT: Record<string, string> = {
  attack_as: 'A',
  defense_as: 'D',
  fightingspirit_as: 'FS',
  ace: '',
}
export const abilityText = (s: string) =>
  s
    .replace(/\{([^{}]+)\}/g, (m, name: string) => SYMBOL_TEXT[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
