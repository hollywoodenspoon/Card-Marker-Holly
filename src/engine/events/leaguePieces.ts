/**
 * Pieces for the league: entering a tournament, asking about points, rating and
 * invites, and reacting when a tournament ends. They act through the RunContext's
 * `world` and do nothing without one.
 */
import { registerPiece, type PieceDef } from './pieces'

const num = (v: unknown, d = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || d

const OPS = [
  { value: '>=', label: 'at least' },
  { value: '<=', label: 'at most' },
  { value: '=', label: 'exactly' },
  { value: '>', label: 'more than' },
  { value: '<', label: 'less than' },
]

const compare = (v: number, op: unknown, x: number) =>
  op === '<=' ? v <= x : op === '=' ? v === x : op === '>' ? v > x : op === '<' ? v < x : v >= x

const leaguePieces: PieceDef[] = [
  {
    kind: 'cause',
    id: 'tournament.end',
    label: 'A tournament the player was in ends',
    group: 'League',
    sentence: 'When a tournament the player was in ends',
    fields: [],
    attach: ['game'],
  },
  {
    kind: 'condition',
    id: 'tournament.can',
    label: 'The player can enter a tournament',
    group: 'League',
    sentence: 'the player can enter {tournament}',
    fields: [{ key: 'tournament', label: 'Tournament', kind: 'tournament' }],
    test: (ctx, a) => ctx.world?.canEnter(String(a.tournament ?? '')) ?? false,
  },
  {
    kind: 'condition',
    id: 'points.has',
    label: 'The player has points',
    group: 'League',
    sentence: 'the player has {op} {value} points on {track}',
    fields: [
      { key: 'op', label: 'Comparison', kind: 'select', options: OPS, default: '>=' },
      { key: 'value', label: 'Points', kind: 'int', default: 10 },
      { key: 'track', label: 'Track', kind: 'track' },
    ],
    test: (ctx, a) =>
      compare(ctx.world?.points(String(a.track ?? '')) ?? 0, a.op, num(a.value)),
  },
  {
    kind: 'condition',
    id: 'rating.has',
    label: 'The player’s rating',
    group: 'League',
    sentence: 'the player’s rating is {op} {value}',
    fields: [
      { key: 'op', label: 'Comparison', kind: 'select', options: OPS, default: '>=' },
      { key: 'value', label: 'Rating', kind: 'int', default: 1000 },
    ],
    test: (ctx, a) => compare(ctx.world?.rating() ?? 0, a.op, num(a.value)),
  },
  {
    kind: 'effect',
    id: 'tournament.run',
    label: 'Enter a tournament',
    group: 'League',
    sentence: 'enter {tournament} with {deck}, then put the place in {placeVar}',
    fields: [
      { key: 'tournament', label: 'Tournament', kind: 'tournament' },
      { key: 'deck', label: 'Deck', kind: 'deck' },
      { key: 'placeVar', label: 'Number for the place', kind: 'number' },
    ],
    run: (ctx, a) =>
      ctx.world?.runTournament(
        String(a.tournament ?? ''),
        String(a.deck ?? ''),
        String(a.placeVar ?? ''),
      ),
  },
]

for (const p of leaguePieces) registerPiece(p)
