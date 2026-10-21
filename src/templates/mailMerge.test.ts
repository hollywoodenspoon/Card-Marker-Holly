import { describe, expect, it } from 'vitest'
import {
  createCard,
  createIconRow,
  createImageField,
  createTemplate,
  createText,
} from '@/core/model/factories'
import type { Asset, Card, Template } from '@/core/model/types'
import { plainText } from '@/core/text/richtext'
import {
  columnIndex,
  columnLetter,
  lettersFromHeaders,
  nameColumnFromHeaders,
  parseRows,
  planMerge,
  rowsToRead,
  type MergeContext,
  type Table,
} from './mailMerge'

const size = { presetId: 'id', widthMm: 54, heightMm: 86 }
const box = { xMm: 0, yMm: 0, wMm: 10, hMm: 10 }

function setup() {
  const front: Template = createTemplate('p', 'front', size, 'Creature', [
    createText(box, { name: 'Title', mergeColumn: 'A' }),
    createText(box, { name: 'Rules', mergeColumn: 'B' }),
    createImageField(box, { name: 'Art', mergeColumn: 'C' }),
    createIconRow(box, { name: 'Attack', mergeColumn: 'D' }),
  ])
  const spell: Template = createTemplate('p', 'front', size, 'Spell', [
    createText(box, { name: 'Title', mergeColumn: 'A' }),
    createText(box, { name: 'Effect', mergeColumn: 'B' }),
  ])
  const back: Template = createTemplate('p', 'back', size, 'Basic back', [])
  const dragon: Asset = {
    id: 'a1',
    projectId: 'p',
    name: 'Dragon.png',
    mime: 'image/png',
    blob: new Blob(),
    widthPx: 10,
    heightPx: 10,
    isVector: false,
    tags: [],
    createdAt: 0,
  }
  const ctx: MergeContext = {
    templates: { [front.id]: front, [spell.id]: spell, [back.id]: back },
    assets: [dragon],
    cards: [],
  }
  return { front, spell, back, dragon, ctx }
}

const sheet: Table = [
  ['Title', 'Rules', 'Art', 'Attack', 'Copies', 'Template'],
  ['Red Dragon', 'Flies.\nBurns {fire}.', 'dragon', '3', '2', ''],
  ['', '', '', '', '', ''],
  ['Goblin', 'Sneaky', '', '1', '', ''],
  ['Bolt', 'Deal 3', '', '', '', 'Spell'],
]

describe('columns and rows', () => {
  it('converts column letters both ways', () => {
    expect([columnIndex('A'), columnIndex('z'), columnIndex('AA'), columnIndex(' ab ')]).toEqual([
      0, 25, 26, 27,
    ])
    expect(columnIndex('1')).toBeUndefined()
    expect(columnIndex('')).toBeUndefined()
    expect([0, 25, 26, 701, 702].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA'])
  })

  it('parses row lists and ranges and reports bad parts', () => {
    expect([...parseRows('2-4, 7').rows!]).toEqual([2, 3, 4, 7])
    expect(parseRows('').rows).toBeNull()
    expect(parseRows('3, x, 5-2').bad).toEqual(['x', '5-2'])
  })

  it('reads from the first row, within "only" rows, minus skipped and empty rows', () => {
    expect(rowsToRead(sheet, {}).rows).toEqual([2, 4, 5]) // row 3 is empty
    expect(rowsToRead(sheet, { firstRow: 4 }).rows).toEqual([4, 5])
    expect(rowsToRead(sheet, { rows: '1-4', skip: '4' }).rows).toEqual([2])
  })
})

describe('planMerge', () => {
  it('turns each row into a card with typed values', () => {
    const { front, back, dragon, ctx } = setup()
    const plan = planMerge(
      sheet,
      { frontTemplateId: front.id, backTemplateId: back.id, copiesColumn: 'E', nameColumn: 'A' },
      ctx,
    )
    expect(plan.rowsRead).toBe(3)
    expect(plan.adds).toBe(3)
    const [dragonCard, goblin] = plan.cards
    expect(dragonCard).toMatchObject({ row: 2, name: 'Red Dragon', copies: 2 })
    expect(dragonCard.frontTemplateId).toBe(front.id)
    const rules = dragonCard.values.Rules
    expect(rules.kind === 'text' && plainText(rules.text)).toBe('Flies.\nBurns {fire}.')
    expect(dragonCard.values.Art).toMatchObject({ kind: 'image', assetId: dragon.id, zoom: 1 })
    expect(dragonCard.values.Attack).toEqual({ kind: 'count', count: 3 })
    // empty cells set nothing, so the template default shows
    expect(goblin.values.Art).toBeUndefined()
    expect(goblin.copies).toBeUndefined()
  })

  it('uses a per-row template column, and the default when the name is unknown', () => {
    const { front, spell, ctx } = setup()
    const rows: Table = [...sheet, ['Odd', '', '', '', '', 'Nope']]
    const plan = planMerge(rows, { frontTemplateId: front.id, frontColumn: 'F' }, ctx)
    const bolt = plan.cards.find((c) => c.row === 5)!
    expect(bolt.frontTemplateId).toBe(spell.id)
    // the Spell template reads column B as "Effect"
    expect(Object.keys(bolt.values).sort()).toEqual(['Effect', 'Title'])
    expect(plan.cards.find((c) => c.row === 6)!.frontTemplateId).toBe(front.id)
    expect(plan.issues.map((i) => i.message)).toContain('No front template called “Nope”.')
  })

  it('reports missing images and bad numbers instead of guessing', () => {
    const { front, ctx } = setup()
    const rows: Table = [[], ['A', '', 'unicorn.png', 'lots']]
    const plan = planMerge(rows, { frontTemplateId: front.id }, ctx)
    expect(plan.cards[0].values).toEqual({ Title: expect.anything() })
    expect(plan.issues).toEqual([
      { row: 2, message: 'No image called “unicorn.png” for “Art”. Upload it first.' },
      { row: 2, message: '“Attack” needs a number, not “lots”.' },
    ])
  })

  it('makes names unique and falls back to the row number', () => {
    const { front, ctx } = setup()
    ctx.cards = [{ ...createCard('p', 1, front.id, null, 'Goblin') }]
    const plan = planMerge(sheet, { frontTemplateId: front.id, nameColumn: 'A', mode: 'add' }, ctx)
    expect(plan.cards.map((c) => c.name)).toEqual(['Red Dragon', 'Goblin 2', 'Bolt'])
    const unnamed = planMerge(sheet, { frontTemplateId: front.id, mode: 'add' }, ctx)
    expect(unnamed.cards[0].name).toBe('Row 2')
  })

  it('merge mode updates the card made from the same row and adds the rest', () => {
    const { front, dragon, ctx } = setup()
    const earlier: Card = {
      ...createCard('p', 1, front.id, null, 'Red Dragon'),
      mergeRow: 2,
      fields: {
        Art: { kind: 'image', assetId: dragon.id, offsetXMm: 2, offsetYMm: 1, zoom: 1.5 },
      },
    }
    ctx.cards = [earlier]
    const plan = planMerge(sheet, { frontTemplateId: front.id, mode: 'merge' }, ctx)
    expect([plan.updates, plan.adds]).toEqual([1, 2])
    const update = plan.cards[0]
    expect(update.cardId).toBe(earlier.id)
    expect(update.frontTemplateId).toBe(front.id)
    // the same picture keeps the framing the owner set on the card
    expect(update.values.Art).toBe(earlier.fields.Art)
    // with no name column, an updated card keeps its name
    expect(update.name).toBeUndefined()
  })

  it('add mode always creates new cards', () => {
    const { front, ctx } = setup()
    ctx.cards = [{ ...createCard('p', 1, front.id, null, 'X'), mergeRow: 2 }]
    const plan = planMerge(sheet, { frontTemplateId: front.id, mode: 'add' }, ctx)
    expect([plan.updates, plan.adds]).toEqual([0, 3])
  })

  it('reads letters from a header row', () => {
    expect(lettersFromHeaders(sheet[0], ['title', 'Attack', 'Missing'])).toEqual({
      title: 'A',
      Attack: 'D',
    })
  })
})

describe('card name column from headers', () => {
  it('finds Name, Card name and field-style names such as Name_AS', () => {
    expect(nameColumnFromHeaders(['Code', 'Name'])).toBe('B')
    expect(nameColumnFromHeaders(['Card name', 'Cost'])).toBe('A')
    expect(nameColumnFromHeaders(['Code_AS', 'Type_AS', 'Name_AS'])).toBe('C')
    expect(nameColumnFromHeaders(['id', 'card_name'])).toBe('B')
  })

  it('prefers an exact name over a title, and ignores other words', () => {
    expect(nameColumnFromHeaders(['Title', 'Name'])).toBe('B')
    expect(nameColumnFromHeaders(['Title', 'Rules'])).toBe('A')
    expect(nameColumnFromHeaders(['Nickname', 'Rename', 'Cost'])).toBeUndefined()
  })
})
