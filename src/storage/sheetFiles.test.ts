import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { parseDelimited, readXlsx } from './sheetFiles'

describe('parseDelimited', () => {
  it('reads CSV with quoted commas and multi-line cells', () => {
    const csv = 'Title,Rules\r\n"Dragon, Red","Flies.\nBurns."\r\nGoblin,Sneaky\r\n'
    expect(parseDelimited(csv)).toEqual([
      ['Title', 'Rules'],
      ['Dragon, Red', 'Flies.\nBurns.'],
      ['Goblin', 'Sneaky'],
    ])
  })

  it('reads cells pasted from a spreadsheet (tab-separated)', () => {
    expect(parseDelimited('Title\tAttack\nDragon\t3\n')).toEqual([
      ['Title', 'Attack'],
      ['Dragon', '3'],
    ])
  })

  it('ignores a byte-order mark', () => {
    expect(parseDelimited('\uFEFFA,B\n1,2')[0]).toEqual(['A', 'B'])
  })
})

/** A minimal .xlsx: one sheet with inline strings and a number. */
function tinyXlsx() {
  const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>Title</t></is></c><c r="B1" t="inlineStr"><is><t>Attack</t></is></c></row>
<row r="2"><c r="A2" t="inlineStr"><is><t>Dragon</t></is></c><c r="B2"><v>3</v></c></row>
</sheetData></worksheet>`
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Cards" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': sheet,
  }
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])))
  return zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer
}

describe('readXlsx', () => {
  it('reads every sheet as a table of strings', async () => {
    const sheets = await readXlsx(tinyXlsx())
    expect(sheets).toEqual([
      {
        name: 'Cards',
        table: [
          ['Title', 'Attack'],
          ['Dragon', '3'],
        ],
      },
    ])
  })
})
