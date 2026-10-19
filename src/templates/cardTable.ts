/**
 * Card data as a table: one row per card, one column per field (plus name,
 * templates and copies). Feeds the data view and its CSV export, which is the
 * reverse of mail merge: the same columns, so an export can be merged back in.
 * Pure, no DOM.
 */
import type { Asset, Card, FieldElement, Id, MergeSettings, Template } from '@/core/model/types'
import { plainText } from '@/core/text/richtext'
import { columnIndex, columnLetter, mergeFields, type Table } from './mailMerge'
import { isPlain } from './proofread'

export type ColumnKind = 'name' | 'front' | 'back' | 'copies' | 'text' | 'image' | 'count'

export interface TableColumn {
  /** Unique key: the kind for the fixed columns, `field:<name>` for fields. */
  key: string
  label: string
  kind: ColumnKind
  field?: string
  /** Spreadsheet column letter it is exported to. */
  letter: string
}

export interface TableCell {
  /** The card's own value as text ('' = none, the template default applies). */
  value: string
  /** What the template shows when the card has no value of its own. */
  fallback: string
  /** The card's templates have this field (false: greyed out). */
  has: boolean
  /** Can be edited in the table (formatted text is edited on the card). */
  editable: boolean
}

export interface TableContext {
  templates: Record<Id, Template>
  assets: Record<Id, Asset>
  copies: (cardId: Id) => number
}

const kindOf = (e: FieldElement): ColumnKind =>
  e.type === 'text' ? 'text' : e.type === 'imageField' ? 'image' : 'count'

const cardTemplates = (c: Card, templates: Record<Id, Template>) => [
  c.frontTemplateId ? templates[c.frontTemplateId] : undefined,
  c.backTemplateId ? templates[c.backTemplateId] : undefined,
]

/**
 * Columns for these cards: name, front, back, copies, then every field of the
 * templates they use. Columns sit at the letters mail merge uses (the merge
 * settings, and each field's merge column); the rest fill the free letters.
 */
export function tableColumns(
  cards: Card[],
  templates: Record<Id, Template>,
  merge: MergeSettings = {},
): TableColumn[] {
  const used: Template[] = []
  for (const c of cards)
    for (const t of cardTemplates(c, templates)) if (t && !used.includes(t)) used.push(t)
  // Front templates first, so front fields come before back fields.
  used.sort((a, b) => (a.side === b.side ? 0 : a.side === 'front' ? -1 : 1))
  const fields = mergeFields(used)

  const cols: (Omit<TableColumn, 'letter'> & { want?: string })[] = [
    { key: 'name', label: 'Name', kind: 'name', want: merge.nameColumn },
    { key: 'front', label: 'Front template', kind: 'front', want: merge.frontColumn },
    { key: 'back', label: 'Back template', kind: 'back', want: merge.backColumn },
    { key: 'copies', label: 'Copies', kind: 'copies', want: merge.copiesColumn },
    ...[...fields].map(([name, e]) => ({
      key: `field:${name}`,
      label: name,
      kind: kindOf(e),
      field: name,
      want: e.mergeColumn,
    })),
  ]
  const at = new Map<number, (typeof cols)[number]>()
  for (const c of cols) {
    const i = columnIndex(c.want)
    if (i !== undefined && !at.has(i)) at.set(i, c)
  }
  let free = 0
  for (const c of cols) {
    if ([...at.values()].includes(c)) continue
    while (at.has(free)) free++
    at.set(free, c)
  }
  return [...at.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, { want: _, ...c }]) => ({ ...c, letter: columnLetter(i) }))
}

/** One card's cells, in column order. */
export function tableRow(card: Card, columns: TableColumn[], ctx: TableContext): TableCell[] {
  const own = mergeFields(cardTemplates(card, ctx.templates))
  const assetName = (id: Id | undefined) => (id ? (ctx.assets[id]?.name ?? '') : '')
  const tname = (id: Id | null) => (id ? (ctx.templates[id]?.name ?? '') : '')
  return columns.map((col): TableCell => {
    const fixed = (value: string): TableCell => ({ value, fallback: '', has: true, editable: true })
    switch (col.kind) {
      case 'name':
        return fixed(card.name)
      case 'front':
        return fixed(tname(card.frontTemplateId))
      case 'back':
        return fixed(tname(card.backTemplateId))
      case 'copies':
        return fixed(String(ctx.copies(card.id)))
    }
    const e = own.get(col.field!)
    const v = card.fields[col.field!]
    if (!e || kindOf(e) !== col.kind)
      return { value: '', fallback: '', has: false, editable: false }
    if (e.type === 'text') {
      const text = v?.kind === 'text' ? v.text : undefined
      return {
        value: text ? plainText(text) : '',
        fallback: plainText(e.defaultText),
        has: true,
        editable: !text || isPlain(text),
      }
    }
    if (e.type === 'imageField')
      return {
        value: v?.kind === 'image' ? assetName(v.assetId) : '',
        fallback: assetName(e.defaultAssetId),
        has: true,
        editable: true,
      }
    return {
      value: v?.kind === 'count' ? String(v.count) : '',
      fallback: String(e.defaultCount),
      has: true,
      editable: true,
    }
  })
}

/**
 * Rows for a CSV file: the header row, then one row per card, placed at each
 * column's letter (gaps stay empty). Cells hold the card's own values, so an
 * empty cell means "template default", exactly as mail merge reads it.
 */
export function toCsvRows(cards: Card[], columns: TableColumn[], ctx: TableContext): Table {
  const width = Math.max(0, ...columns.map((c) => columnIndex(c.letter)! + 1))
  const line = (cells: string[]) => {
    const out = Array<string>(width).fill('')
    columns.forEach((c, i) => (out[columnIndex(c.letter)!] = cells[i]))
    return out
  }
  return [
    line(columns.map((c) => c.label)),
    ...cards.map((card) => line(tableRow(card, columns, ctx).map((c) => c.value))),
  ]
}

/** Merge settings that read a CSV made by `toCsvRows` with these columns. */
export function mergeSettingsFor(columns: TableColumn[]): MergeSettings {
  const letter = (k: ColumnKind) => columns.find((c) => c.kind === k)?.letter
  return {
    nameColumn: letter('name'),
    frontColumn: letter('front'),
    backColumn: letter('back'),
    copiesColumn: letter('copies'),
    firstRow: 2,
  }
}
