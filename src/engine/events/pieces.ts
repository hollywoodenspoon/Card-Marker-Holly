/**
 * The pieces Cause and Effect is built from: causes ("when…"), conditions
 * ("only if…") and effects ("do…"). Each is registered here with a sentence and
 * the settings it asks for, so the editor can show and edit any piece, and a
 * module adds its own pieces without changing the engine. Effects and conditions
 * run against a RunContext (the runtime, or a test).
 */
import type { Args } from '../model/events'

/** What a setting picks from (the editor lists only what exists in the game). */
export type FieldKind =
  'scene' | 'flag' | 'number' | 'object' | 'deck' | 'recipe' | 'text' | 'int' | 'percent' | 'select'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  options?: { value: string; label: string }[]
  default?: string | number | boolean
}

/** Where a cause can be attached. */
export type Attach = 'area' | 'object' | 'scene' | 'game'

/** What effects and conditions can do in a running game. */
export interface RunContext {
  getVar: (id: string) => boolean | number | undefined
  setVar: (id: string, value: boolean | number) => void
  /** 0–1, from the game's seeded random numbers. */
  random: () => number
  goToScene: (id: string) => void
  setObjectVisible: (id: string, visible: boolean) => void
  showMessage: (text: string) => Promise<void>
  /** Show the choices and resolve with the picked index. */
  choose: (prompt: string, options: string[]) => Promise<number>
  wait: (ms: number) => Promise<void>
  /** Runs a saved recipe's steps here. */
  runRecipe: (id: string) => Promise<void>
  /** Anything a module adds (deck building, starting a card game…), by name. */
  call: (service: string, args: Args) => Promise<void>
  /** True once the run should stop (preview closed). */
  stopped: () => boolean
}

interface Base {
  id: string
  label: string
  group: string
  /** With {key} for each setting: "Go to {scene}". */
  sentence: string
  fields: FieldDef[]
}

export interface CauseDef extends Base {
  kind: 'cause'
  attach: Attach[]
}

export interface ConditionDef extends Base {
  kind: 'condition'
  test: (ctx: RunContext, args: Args) => boolean
}

export interface EffectDef extends Base {
  kind: 'effect'
  run: (ctx: RunContext, args: Args) => void | Promise<void>
}

export type PieceDef = CauseDef | ConditionDef | EffectDef

const pieces = new Map<string, PieceDef>()

export function registerPiece(p: PieceDef) {
  pieces.set(p.id, p)
}

export const piece = (id: string) => pieces.get(id)
export const piecesOf = <K extends PieceDef['kind']>(kind: K) =>
  [...pieces.values()].filter((p): p is Extract<PieceDef, { kind: K }> => p.kind === kind)

/** Default settings for a new piece. */
export function defaultArgs(def: PieceDef): Args {
  const a: Args = {}
  for (const f of def.fields)
    a[f.key] = f.default ?? (f.kind === 'int' || f.kind === 'percent' ? 0 : undefined)
  return a
}

const num = (v: unknown, d = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || d

// ---------- built-in pieces ----------

const builtins: PieceDef[] = [
  // Causes
  {
    kind: 'cause',
    id: 'area.click',
    label: 'Player clicks this',
    group: 'Player',
    sentence: 'When the player clicks this',
    fields: [],
    attach: ['area', 'object'],
  },
  {
    kind: 'cause',
    id: 'scene.start',
    label: 'This scene starts',
    group: 'Scenes',
    sentence: 'When this scene starts',
    fields: [],
    attach: ['scene'],
  },
  {
    kind: 'cause',
    id: 'game.start',
    label: 'The game starts',
    group: 'Game',
    sentence: 'When the game starts',
    fields: [],
    attach: ['game'],
  },

  // Conditions
  {
    kind: 'condition',
    id: 'flag.is',
    label: 'A flag is on or off',
    group: 'Variables',
    sentence: '{flag} is {state}',
    fields: [
      { key: 'flag', label: 'Flag', kind: 'flag' },
      {
        key: 'state',
        label: 'On or off',
        kind: 'select',
        options: [
          { value: 'on', label: 'on' },
          { value: 'off', label: 'off' },
        ],
        default: 'on',
      },
    ],
    test: (ctx, a) => (ctx.getVar(String(a.flag)) === true) === (a.state !== 'off'),
  },
  {
    kind: 'condition',
    id: 'number.compare',
    label: 'A number compares to a value',
    group: 'Variables',
    sentence: '{number} is {op} {value}',
    fields: [
      { key: 'number', label: 'Number', kind: 'number' },
      {
        key: 'op',
        label: 'Comparison',
        kind: 'select',
        options: [
          { value: '>=', label: 'at least' },
          { value: '<=', label: 'at most' },
          { value: '=', label: 'exactly' },
          { value: '>', label: 'more than' },
          { value: '<', label: 'less than' },
        ],
        default: '>=',
      },
      { key: 'value', label: 'Value', kind: 'int', default: 0 },
    ],
    test: (ctx, a) => {
      const v = num(ctx.getVar(String(a.number)))
      const x = num(a.value)
      return a.op === '<='
        ? v <= x
        : a.op === '='
          ? v === x
          : a.op === '>'
            ? v > x
            : a.op === '<'
              ? v < x
              : v >= x
    },
  },
  {
    kind: 'condition',
    id: 'chance',
    label: 'A random chance',
    group: 'Random',
    sentence: 'a {percent}% chance comes up',
    fields: [{ key: 'percent', label: 'Chance (%)', kind: 'percent', default: 50 }],
    test: (ctx, a) => ctx.random() * 100 < num(a.percent, 50),
  },

  // Effects
  {
    kind: 'effect',
    id: 'scene.go',
    label: 'Go to a scene',
    group: 'Scenes',
    sentence: 'go to {scene}',
    fields: [{ key: 'scene', label: 'Scene', kind: 'scene' }],
    run: (ctx, a) => ctx.goToScene(String(a.scene ?? '')),
  },
  {
    kind: 'effect',
    id: 'flag.set',
    label: 'Turn a flag on or off',
    group: 'Variables',
    sentence: 'turn {flag} {state}',
    fields: [
      { key: 'flag', label: 'Flag', kind: 'flag' },
      {
        key: 'state',
        label: 'On or off',
        kind: 'select',
        options: [
          { value: 'on', label: 'on' },
          { value: 'off', label: 'off' },
          { value: 'toggle', label: 'the other way' },
        ],
        default: 'on',
      },
    ],
    run: (ctx, a) => {
      const id = String(a.flag ?? '')
      ctx.setVar(id, a.state === 'toggle' ? ctx.getVar(id) !== true : a.state !== 'off')
    },
  },
  {
    kind: 'effect',
    id: 'number.change',
    label: 'Change a number',
    group: 'Variables',
    sentence: '{op} {number} {by} {value}',
    fields: [
      {
        key: 'op',
        label: 'Change',
        kind: 'select',
        options: [
          { value: 'add', label: 'add to' },
          { value: 'sub', label: 'take from' },
          { value: 'set', label: 'set' },
        ],
        default: 'add',
      },
      { key: 'number', label: 'Number', kind: 'number' },
      {
        key: 'by',
        label: '',
        kind: 'select',
        options: [{ value: 'by', label: 'by / to' }],
        default: 'by',
      },
      { key: 'value', label: 'Value', kind: 'int', default: 1 },
    ],
    run: (ctx, a) => {
      const id = String(a.number ?? '')
      const cur = num(ctx.getVar(id))
      const x = num(a.value)
      ctx.setVar(id, a.op === 'set' ? x : a.op === 'sub' ? cur - x : cur + x)
    },
  },
  {
    kind: 'effect',
    id: 'object.show',
    label: 'Show or hide something',
    group: 'Scenes',
    sentence: '{state} {object}',
    fields: [
      {
        key: 'state',
        label: 'Show or hide',
        kind: 'select',
        options: [
          { value: 'show', label: 'show' },
          { value: 'hide', label: 'hide' },
        ],
        default: 'show',
      },
      { key: 'object', label: 'What', kind: 'object' },
    ],
    run: (ctx, a) => ctx.setObjectVisible(String(a.object ?? ''), a.state !== 'hide'),
  },
  {
    kind: 'effect',
    id: 'message.show',
    label: 'Show a message',
    group: 'Text',
    sentence: 'show “{text}”',
    fields: [{ key: 'text', label: 'Message', kind: 'text', default: '' }],
    run: (ctx, a) => ctx.showMessage(String(a.text ?? '')),
  },
  {
    kind: 'effect',
    id: 'wait',
    label: 'Wait',
    group: 'Flow',
    sentence: 'wait {ms} ms',
    fields: [{ key: 'ms', label: 'Milliseconds', kind: 'int', default: 500 }],
    run: (ctx, a) => ctx.wait(Math.max(0, num(a.ms, 500))),
  },
  {
    kind: 'effect',
    id: 'recipe.run',
    label: 'Run a recipe',
    group: 'Flow',
    sentence: 'run the recipe {recipe}',
    fields: [{ key: 'recipe', label: 'Recipe', kind: 'recipe' }],
    run: (ctx, a) => ctx.runRecipe(String(a.recipe ?? '')),
  },
  {
    kind: 'effect',
    id: 'deck.build',
    label: 'Build a deck',
    group: 'Cards',
    sentence: 'build {into} at {level} level from {from}',
    fields: [
      { key: 'into', label: 'Into deck', kind: 'deck' },
      {
        key: 'level',
        label: 'Level',
        kind: 'select',
        options: [
          { value: 'suboptimal', label: 'suboptimal' },
          { value: 'optimal', label: 'optimal' },
          { value: 'veryOptimal', label: 'very optimal' },
        ],
        default: 'optimal',
      },
      { key: 'from', label: 'From', kind: 'deck' },
    ],
    run: (ctx, a) => ctx.call('deck.build', a),
  },
  {
    kind: 'effect',
    id: 'cards.play',
    label: 'Start a card game',
    group: 'Cards',
    sentence: 'start a card game: {deckA} against {deckB} ({bot} bot)',
    fields: [
      { key: 'deckA', label: 'Player deck', kind: 'deck' },
      { key: 'deckB', label: 'Opponent deck', kind: 'deck' },
      {
        key: 'bot',
        label: 'Opponent',
        kind: 'select',
        options: [
          { value: 'easy', label: 'Easy' },
          { value: 'normal', label: 'Normal' },
          { value: 'hard', label: 'Hard' },
          { value: 'none', label: 'no' },
        ],
        default: 'normal',
      },
    ],
    run: (ctx, a) => ctx.call('cards.play', a),
  },
]

for (const p of builtins) registerPiece(p)
