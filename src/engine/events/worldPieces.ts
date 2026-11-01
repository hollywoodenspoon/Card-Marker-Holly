/**
 * Pieces for the player's world: dialogue, money, items, cards, shops, boosters,
 * weeks and the calendar. They act through the RunContext's `world` and do
 * nothing without one.
 */
import type { Args } from '../model/events'
import { dateOf } from '../model/calendar'
import { registerPiece, type Owned, type PieceDef, type RunContext } from './pieces'

const num = (v: unknown, d = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || d

const compare = (v: number, op: unknown, x: number) =>
  op === '<=' ? v <= x : op === '=' ? v === x : op === '>' ? v > x : op === '<' ? v < x : v >= x

const OPS = [
  { value: '>=', label: 'at least' },
  { value: '<=', label: 'at most' },
  { value: '=', label: 'exactly' },
  { value: '>', label: 'more than' },
  { value: '<', label: 'less than' },
]

const GIVE_TAKE = [
  { value: 'give', label: 'give' },
  { value: 'take', label: 'take' },
]

function moneyVar(ctx: RunContext): string | null {
  return ctx.world?.game().economy.money ?? null
}

function getMoney(ctx: RunContext): number {
  const id = moneyVar(ctx)
  return id ? num(ctx.getVar(id)) : 0
}

function changeMoney(ctx: RunContext, a: Args) {
  const id = moneyVar(ctx)
  if (!id) return
  const x = Math.max(0, num(a.value))
  const cur = getMoney(ctx)
  ctx.setVar(id, a.op === 'set' ? x : a.op === 'take' ? Math.max(0, cur - x) : cur + x)
}

const worldPieces: PieceDef[] = [
  // Causes
  {
    kind: 'cause',
    id: 'week.start',
    label: 'A new week starts',
    group: 'Weeks',
    sentence: 'When a new week starts',
    fields: [],
    attach: ['game'],
  },

  // Conditions
  {
    kind: 'condition',
    id: 'money.has',
    label: 'The player has money',
    group: 'Money and items',
    sentence: 'the player has {op} {value} money',
    fields: [
      { key: 'op', label: 'Comparison', kind: 'select', options: OPS, default: '>=' },
      { key: 'value', label: 'Amount', kind: 'int', default: 10 },
    ],
    test: (ctx, a) => compare(getMoney(ctx), a.op, num(a.value)),
  },
  {
    kind: 'condition',
    id: 'item.has',
    label: 'The player has an item',
    group: 'Money and items',
    sentence: 'the player has {op} {count} {item}',
    fields: [
      { key: 'op', label: 'Comparison', kind: 'select', options: OPS, default: '>=' },
      { key: 'count', label: 'Count', kind: 'int', default: 1 },
      { key: 'item', label: 'Item', kind: 'item' },
    ],
    test: (ctx, a) =>
      compare(ctx.world?.count('item', String(a.item ?? '')) ?? 0, a.op, num(a.count, 1)),
  },
  {
    kind: 'condition',
    id: 'card.has',
    label: 'The player owns a card',
    group: 'Cards',
    sentence: 'the player owns {op} {count} {which} {card}',
    fields: [
      { key: 'op', label: 'Comparison', kind: 'select', options: OPS, default: '>=' },
      { key: 'count', label: 'Count', kind: 'int', default: 1 },
      {
        key: 'which',
        label: 'Copies',
        kind: 'select',
        options: [
          { value: 'anyCard', label: 'copies of' },
          { value: 'card', label: 'normal copies of' },
          { value: 'foil', label: 'foil copies of' },
        ],
        default: 'anyCard',
      },
      { key: 'card', label: 'Card', kind: 'card' },
    ],
    test: (ctx, a) =>
      compare(
        ctx.world?.count((a.which as Owned) || 'anyCard', String(a.card ?? '')) ?? 0,
        a.op,
        num(a.count, 1),
      ),
  },
  {
    kind: 'condition',
    id: 'calendar.on',
    label: 'A calendar event is this week',
    group: 'Weeks',
    sentence: '{event} is this week',
    fields: [{ key: 'event', label: 'Calendar event', kind: 'calEvent' }],
    test: (ctx, a) => ctx.world?.isOnThisWeek(String(a.event ?? '')) ?? false,
  },
  {
    kind: 'condition',
    id: 'date.compare',
    label: 'The date',
    group: 'Weeks',
    sentence: 'the {part} is {op} {value}',
    fields: [
      {
        key: 'part',
        label: 'Part of the date',
        kind: 'select',
        options: [
          { value: 'year', label: 'year' },
          { value: 'season', label: 'season of the year' },
          { value: 'month', label: 'month of the year' },
          { value: 'weekOfSeason', label: 'week of the season' },
          { value: 'week', label: 'week of the month' },
          { value: 'played', label: 'number of weeks played' },
        ],
        default: 'year',
      },
      { key: 'op', label: 'Comparison', kind: 'select', options: OPS, default: '>=' },
      { key: 'value', label: 'Value', kind: 'int', default: 1 },
    ],
    test: (ctx, a) => {
      const w = ctx.world
      if (!w) return false
      const week = w.week()
      const d = dateOf(w.game().calendar, week)
      const part = String(a.part ?? 'year')
      const v = part === 'played' ? week : (d[part as keyof typeof d] ?? d.year)
      return compare(v, a.op, num(a.value))
    },
  },

  // Effects
  {
    kind: 'effect',
    id: 'say',
    label: 'A character says something',
    group: 'Text',
    sentence: '{character} ({expression}) says {text}',
    fields: [
      { key: 'character', label: 'Character', kind: 'character' },
      { key: 'expression', label: 'Expression', kind: 'expression' },
      { key: 'text', label: 'Words', kind: 'longText', default: '' },
    ],
    run: (ctx, a) =>
      ctx.world
        ? ctx.world.say(String(a.character ?? ''), String(a.expression ?? ''), String(a.text ?? ''))
        : ctx.showMessage(String(a.text ?? '')),
  },
  {
    kind: 'effect',
    id: 'hint.show',
    label: 'Show a tutorial hint',
    group: 'Text',
    sentence: 'show the hint {text}, shown {once}, remembered as {name}',
    fields: [
      { key: 'text', label: 'Hint', kind: 'longText', default: '' },
      {
        key: 'once',
        label: 'How often',
        kind: 'select',
        options: [
          { value: 'once', label: 'only the first time' },
          { value: 'always', label: 'every time' },
        ],
        default: 'once',
      },
      { key: 'name', label: 'Name (to remember it)', kind: 'text', default: '' },
    ],
    run: (ctx, a) => ctx.world?.showHint(String(a.text ?? ''), a.once !== 'always', String(a.name ?? '')),
  },
  {
    kind: 'effect',
    id: 'money.change',
    label: 'Give or take money',
    group: 'Money and items',
    sentence: '{op} {value} money',
    fields: [
      {
        key: 'op',
        label: 'Change',
        kind: 'select',
        options: [...GIVE_TAKE, { value: 'set', label: 'set the money to' }],
        default: 'give',
      },
      { key: 'value', label: 'Amount', kind: 'int', default: 10 },
    ],
    run: (ctx, a) => changeMoney(ctx, a),
  },
  {
    kind: 'effect',
    id: 'item.give',
    label: 'Give or take an item',
    group: 'Money and items',
    sentence: '{op} {count} {item}',
    fields: [
      { key: 'op', label: 'Change', kind: 'select', options: GIVE_TAKE, default: 'give' },
      { key: 'count', label: 'Count', kind: 'int', default: 1 },
      { key: 'item', label: 'Item', kind: 'item' },
    ],
    run: (ctx, a) => {
      const n = Math.max(0, num(a.count, 1))
      ctx.world?.give('item', String(a.item ?? ''), a.op === 'take' ? -n : n)
    },
  },
  {
    kind: 'effect',
    id: 'card.give',
    label: 'Give or take a card',
    group: 'Cards',
    sentence: '{op} {count} {which} {card}',
    fields: [
      { key: 'op', label: 'Change', kind: 'select', options: GIVE_TAKE, default: 'give' },
      { key: 'count', label: 'Count', kind: 'int', default: 1 },
      {
        key: 'which',
        label: 'Copies',
        kind: 'select',
        options: [
          { value: 'card', label: 'normal' },
          { value: 'foil', label: 'foil' },
          { value: 'anyCard', label: 'any (normal first)' },
        ],
        default: 'card',
      },
      { key: 'card', label: 'Card', kind: 'card' },
    ],
    run: (ctx, a) => {
      const n = Math.max(0, num(a.count, 1))
      const which = (a.which as Owned) || 'card'
      ctx.world?.give(which, String(a.card ?? ''), a.op === 'take' ? -n : n)
    },
  },
  {
    kind: 'effect',
    id: 'booster.open',
    label: 'Open a booster',
    group: 'Cards',
    sentence: 'give the player a {booster} booster to open',
    fields: [{ key: 'booster', label: 'Booster', kind: 'booster' }],
    run: (ctx, a) => ctx.world?.openBooster(String(a.booster ?? '')),
  },
  {
    kind: 'effect',
    id: 'deck.edit',
    label: 'Edit my deck',
    group: 'Cards',
    sentence: 'let the player edit {deck} from the cards they own',
    fields: [{ key: 'deck', label: 'Deck', kind: 'deck' }],
    run: (ctx, a) => ctx.world?.editDeck(String(a.deck ?? '')),
  },
  {
    kind: 'effect',
    id: 'shop.open',
    label: 'Open a shop',
    group: 'Money and items',
    sentence: 'open the shop {shop}',
    fields: [{ key: 'shop', label: 'Shop', kind: 'shop' }],
    run: (ctx, a) => ctx.world?.openShop(String(a.shop ?? '')),
  },
  {
    kind: 'effect',
    id: 'week.pick',
    label: 'Pick this week’s activity',
    group: 'Weeks',
    sentence: 'let the player pick this week’s activity, then start the next week',
    fields: [],
    run: (ctx) => ctx.world?.pickActivity(),
  },
  {
    kind: 'effect',
    id: 'week.next',
    label: 'Start the next week',
    group: 'Weeks',
    sentence: 'start the next week',
    fields: [],
    run: (ctx) => ctx.world?.nextWeek(),
  },
  {
    kind: 'effect',
    id: 'calendar.show',
    label: 'Show the calendar',
    group: 'Weeks',
    sentence: 'show the calendar',
    fields: [],
    run: (ctx) => ctx.world?.showCalendar(),
  },
  {
    kind: 'effect',
    id: 'game.end',
    label: 'End the game',
    group: 'Game',
    sentence: 'end the game with {text}',
    fields: [{ key: 'text', label: 'Ending text', kind: 'longText', default: 'The end.' }],
    run: (ctx, a) => ctx.world?.endGame(String(a.text ?? '')),
  },
]

for (const p of worldPieces) registerPiece(p)
