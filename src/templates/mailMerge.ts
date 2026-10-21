/**
 * Mail merge: turn spreadsheet rows into card values. Template fields name the
 * column they read (`mergeColumn`, a letter like "B"); each row read becomes
 * one card. Pure, no DOM; the spreadsheet arrives as a table of strings.
 */
import { flatten, uniqueName } from '@/core/model/tree'
import type {
  Asset,
  Card,
  FieldElement,
  FieldValue,
  Id,
  ImageValue,
  MergeMode,
  MergeSettings,
  Template,
} from '@/core/model/types'
import { richTextFromPlain } from '@/core/text/richtext'

/** Rows of cells, top row first. Ragged rows are fine. */
export type Table = string[][]

// ---------- columns ----------

/** "A" → 0, "Z" → 25, "AA" → 26. Undefined for anything that isn't letters. */
export function columnIndex(letter: string | undefined): number | undefined {
  const s = (letter ?? '').trim().toUpperCase()
  if (!/^[A-Z]{1,3}$/.test(s)) return undefined
  let n = 0
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** 0 → "A", 26 → "AA". */
export function columnLetter(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const r = (n - 1) % 26
    out = String.fromCharCode(65 + r) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

/** Tidy what someone typed into a column box: letters only, upper case, or undefined. */
export function cleanColumn(s: string): string | undefined {
  const t = s.trim().toUpperCase()
  return columnIndex(t) === undefined ? undefined : t
}

// ---------- rows ----------

/**
 * Parse "2-20, 25" into a set of 1-based row numbers. Empty text gives null
 * (no limit). Anything that isn't a number or range is returned in `bad`.
 */
export function parseRows(text: string | undefined): { rows: Set<number> | null; bad: string[] } {
  const parts = (text ?? '')
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (!parts.length) return { rows: null, bad: [] }
  const rows = new Set<number>()
  const bad: string[] = []
  for (const p of parts) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(p)
    if (!m) {
      bad.push(p)
      continue
    }
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (a < 1 || b < a || b - a > 100000) {
      bad.push(p)
      continue
    }
    for (let r = a; r <= b; r++) rows.add(r)
  }
  return { rows, bad }
}

/** The 1-based spreadsheet rows a merge reads, in order. Fully empty rows are skipped. */
export function rowsToRead(table: Table, s: MergeSettings) {
  const first = Math.max(1, Math.floor(s.firstRow ?? 2))
  const only = parseRows(s.rows)
  const skip = parseRows(s.skip)
  const out: number[] = []
  for (let r = first; r <= table.length; r++) {
    if (only.rows && !only.rows.has(r)) continue
    if (skip.rows?.has(r)) continue
    if (!(table[r - 1] ?? []).some((c) => c.trim() !== '')) continue
    out.push(r)
  }
  return { rows: out, bad: [...only.bad, ...skip.bad] }
}

export const cell = (table: Table, row: number, column: string | undefined) => {
  const i = columnIndex(column)
  return i === undefined ? '' : (table[row - 1]?.[i] ?? '').trim()
}

// ---------- fields ----------

/** Field parts of these templates, by field name (front first), with their column. */
export function mergeFields(templates: (Template | undefined)[]): Map<string, FieldElement> {
  const out = new Map<string, FieldElement>()
  for (const t of templates) {
    if (!t) continue
    for (const e of flatten(t.elements))
      if (
        (e.type === 'text' || e.type === 'imageField' || e.type === 'iconRow') &&
        !out.has(e.fieldName)
      )
        out.set(e.fieldName, e)
  }
  return out
}

/** Asset whose file name matches, with or without its extension, ignoring case. */
export function findImage(assets: Asset[], name: string): Asset | undefined {
  const n = name.trim().toLowerCase()
  if (!n) return undefined
  const bare = (s: string) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '')
  return (
    assets.find((a) => a.name.toLowerCase() === n) ?? assets.find((a) => bare(a.name) === bare(n))
  )
}

// ---------- planning ----------

export interface MergeIssue {
  row?: number
  message: string
}

export interface PlannedCard {
  row: number
  /** Existing card to update (merge mode), or undefined for a new card. */
  cardId?: Id
  name?: string
  frontTemplateId: Id | null
  backTemplateId: Id | null
  values: Record<string, FieldValue>
  copies?: number
}

export interface MergePlan {
  cards: PlannedCard[]
  rowsRead: number
  updates: number
  adds: number
  issues: MergeIssue[]
}

export interface MergeContext {
  templates: Record<Id, Template>
  assets: Asset[]
  cards: Card[]
}

const templateByName = (templates: Template[], side: 'front' | 'back', name: string) => {
  const n = name.trim().toLowerCase()
  return templates.find((t) => t.side === side && t.name.trim().toLowerCase() === n)
}

/**
 * Work out what a merge will do, without changing anything: which rows become
 * which cards, with what values, and anything that needs the owner's attention.
 */
export function planMerge(table: Table, s: MergeSettings, ctx: MergeContext): MergePlan {
  const issues: MergeIssue[] = []
  const { rows, bad } = rowsToRead(table, s)
  if (bad.length) issues.push({ message: `Not a row or range: ${bad.join(', ')}` })
  const mode: MergeMode = s.mode ?? 'merge'
  const all = Object.values(ctx.templates)
  const byRow = new Map<number, Card>()
  if (mode === 'merge')
    for (const c of [...ctx.cards].sort((a, b) => a.order - b.order))
      if (c.mergeRow !== undefined && !byRow.has(c.mergeRow)) byRow.set(c.mergeRow, c)
  const taken = ctx.cards.map((c) => c.name)

  const cards: PlannedCard[] = []
  for (const row of rows) {
    const existing = byRow.get(row)
    const pick = (side: 'front' | 'back', column: string | undefined, fallback: Id | null) => {
      const name = cell(table, row, column)
      if (!name) return fallback
      const t = templateByName(all, side, name)
      if (!t) issues.push({ row, message: `No ${side} template called “${name}”.` })
      return t?.id ?? fallback
    }
    const frontTemplateId = pick(
      'front',
      s.frontColumn,
      existing ? existing.frontTemplateId : (s.frontTemplateId ?? null),
    )
    const backTemplateId = pick(
      'back',
      s.backColumn,
      existing ? existing.backTemplateId : (s.backTemplateId ?? null),
    )
    const fields = mergeFields([
      frontTemplateId ? ctx.templates[frontTemplateId] : undefined,
      backTemplateId ? ctx.templates[backTemplateId] : undefined,
    ])

    const values: Record<string, FieldValue> = {}
    for (const [fieldName, el] of fields) {
      const v = cell(table, row, el.mergeColumn)
      if (!v) continue
      if (el.type === 'text') values[fieldName] = { kind: 'text', text: richTextFromPlain(v) }
      else if (el.type === 'iconRow') {
        const n = Number(v)
        if (Number.isFinite(n) && n >= 0)
          values[fieldName] = { kind: 'count', count: Math.round(n) }
        else issues.push({ row, message: `“${fieldName}” needs a number, not “${v}”.` })
      } else {
        const a = findImage(ctx.assets, v)
        if (!a) {
          issues.push({
            row,
            message: `No image called “${v}” for “${fieldName}”. Upload it first.`,
          })
          continue
        }
        const prev = existing?.fields[fieldName]
        values[fieldName] =
          prev?.kind === 'image' && prev.assetId === a.id
            ? prev // same picture: keep its framing
            : ({
                kind: 'image',
                assetId: a.id,
                offsetXMm: 0,
                offsetYMm: 0,
                zoom: 1,
              } satisfies ImageValue)
      }
    }

    let name: string | undefined = cell(table, row, s.nameColumn) || undefined
    if (!existing) {
      name = uniqueName(name ?? `Row ${row}`, taken)
      taken.push(name)
    }
    let copies: number | undefined
    const c = cell(table, row, s.copiesColumn)
    if (c) {
      const n = Number(c)
      if (Number.isFinite(n) && n >= 0) copies = Math.min(99, Math.round(n))
      else issues.push({ row, message: `Copies needs a number, not “${c}”.` })
    }
    cards.push({ row, cardId: existing?.id, name, frontTemplateId, backTemplateId, values, copies })
  }
  const updates = cards.filter((c) => c.cardId).length
  return { cards, rowsRead: rows.length, updates, adds: cards.length - updates, issues }
}

/** Header names from a row, for "use header names": field name → column letter. */
export function lettersFromHeaders(headerRow: string[], fieldNames: string[]) {
  const out: Record<string, string> = {}
  const norm = (s: string) => s.trim().toLowerCase()
  for (const f of fieldNames) {
    const i = headerRow.findIndex((h) => norm(h) === norm(f))
    if (i >= 0) out[f] = columnLetter(i)
  }
  return out
}

/**
 * The column that names the cards, from a header row: "Name", "Card name",
 * "Title", or a field-style name such as "Name_AS" or "card_name".
 */
export function nameColumnFromHeaders(headerRow: string[]): string | undefined {
  const norm = (s: string) => s.trim().toLowerCase()
  const exact = headerRow.findIndex((h) => ['name', 'card name', 'cardname'].includes(norm(h)))
  if (exact >= 0) return columnLetter(exact)
  const named = headerRow.findIndex((h) => /^name[_ -]|[_ -]name$/.test(norm(h)))
  if (named >= 0) return columnLetter(named)
  const title = headerRow.findIndex((h) => norm(h) === 'title')
  return title >= 0 ? columnLetter(title) : undefined
}
