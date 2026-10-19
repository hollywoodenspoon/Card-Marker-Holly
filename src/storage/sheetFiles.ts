/**
 * Read spreadsheets for mail merge into plain tables of strings: CSV/TSV
 * files, cells pasted from Excel or Google Sheets, and .xlsx workbooks.
 * Loaded on demand (only the mail merge dialog imports it).
 */
import Papa from 'papaparse'
import readXlsxFile from 'read-excel-file/universal'
import type { Table } from '@/templates/mailMerge'

export interface SheetTable {
  name: string
  table: Table
}

/** CSV, TSV or pasted cells. The delimiter (comma, tab, semicolon) is detected. */
export function parseDelimited(text: string): Table {
  const clean = text.replace(/^\uFEFF/, '')
  // Cells copied from a spreadsheet are tab-separated; Papa's guess misses small pastes.
  const firstLine = clean.split(/\r?\n/, 1)[0]
  const r = Papa.parse<string[]>(clean, {
    skipEmptyLines: false,
    ...(firstLine.includes('\t') ? { delimiter: '\t' } : { delimitersToGuess: [',', ';', '|'] }),
  })
  const rows = r.data.map((row) => row.map((c) => String(c ?? '')))
  // A trailing newline leaves one empty row at the end.
  while (rows.length && rows[rows.length - 1].every((c) => c === '')) rows.pop()
  return rows
}

/** A CSV file's text (with a byte-order mark, so Excel reads accents correctly). */
export function toCsv(rows: Table): string {
  return '\uFEFF' + Papa.unparse(rows, { newline: '\r\n' })
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}

/** Every sheet of an .xlsx workbook. */
export async function readXlsx(file: Blob | ArrayBuffer): Promise<SheetTable[]> {
  const sheets = await readXlsxFile(file)
  return sheets.map((s) => ({ name: s.sheet, table: s.data.map((row) => row.map(cellText)) }))
}

const isXlsx = (f: File) =>
  /\.xlsx$/i.test(f.name) ||
  f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** A picked file as one or more sheets. */
export async function readSheetFile(f: File): Promise<SheetTable[]> {
  if (isXlsx(f)) return readXlsx(f)
  if (/\.xls$/i.test(f.name))
    throw new Error('Old .xls files can’t be read. Save the sheet as .xlsx or .csv first.')
  return [{ name: f.name, table: parseDelimited(await f.text()) }]
}
