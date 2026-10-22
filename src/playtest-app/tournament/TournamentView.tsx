import { ArrowLeft, Copy, Eye, Play, Plus, Trash2, Trophy, Users, Zap } from '@/ui/icons'
import { useEffect, useMemo, useState } from 'react'
import { BOT_LEVELS, BOT_NAMES, type BotLevel } from '@/adventure/bot'
import type { AsCard } from '@/adventure/cards'
import { checkDeck } from '@/adventure/deck'
import { buildDeck } from '@/adventure/deckgen/build'
import type { NewGame } from '@/adventure/engine'
import {
  createTournament,
  currentMatches,
  matchLabel,
  nextGameStart,
  placings,
  PRESETS,
  score,
  standings,
  type Entrant,
  type GameRecord,
  type Match,
  type PresetId,
  type StageSpec,
  type Tournament,
  type TournamentSpec,
} from '@/adventure/tournament/tournament'
import {
  deleteTournament,
  listTournaments,
  saveTournament,
  type TournamentRow,
} from '@/playtest/library'
import { randomSeed } from '@/playtest/rng'
import { cn } from '@/lib/cn'
import { askConfirm, toast } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { cardValues } from '../decks/deckgenClient'
import { describeSpec } from './describe'
import { botMatch, nextGame, simulateRound } from './tournamentClient'

/** A deck someone can enter with: a saved deck, or one of the pack's. */
export interface DeckOption {
  id: string
  name: string
  cards: string[]
}

const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const STAGE_NAMES: Record<StageSpec['kind'], string> = {
  roundRobin: 'Round robin',
  swiss: 'Swiss',
  groups: 'Group stage',
  knockout: 'Knockout',
}

type Length = 'format' | '1' | '3' | '3f5'
function withLength(spec: TournamentSpec, length: Length): TournamentSpec {
  if (length === 'format') return spec
  const bo = length === '1' ? 1 : 3
  return {
    ...spec,
    stages: spec.stages.map((s) => ({
      ...s,
      bestOf: bo,
      finalBestOf: s.kind === 'knockout' ? (length === '3f5' ? 5 : bo) : undefined,
    })),
  }
}

type Custom = 'roundRobin' | 'swissCut' | 'groupsKo' | 'knockout'
function customSpec(
  kind: Custom,
  players: number,
  extra: { rounds: number; cut: number; groups: number; advance: number },
): TournamentSpec {
  const stages: StageSpec[] =
    kind === 'roundRobin'
      ? [{ kind: 'roundRobin', bestOf: 1 }]
      : kind === 'swissCut'
        ? [
            { kind: 'swiss', bestOf: 1, rounds: extra.rounds },
            ...(extra.cut > 1
              ? [{ kind: 'knockout' as const, bestOf: 1, advance: extra.cut }]
              : []),
          ]
        : kind === 'groupsKo'
          ? [
              { kind: 'groups', bestOf: 1, groups: extra.groups, advance: extra.advance },
              { kind: 'knockout', bestOf: 1, advance: extra.groups * extra.advance },
            ]
          : [{ kind: 'knockout', bestOf: 1, advance: players }]
  return { name: 'Custom tournament', players, opening: 'rps', stages }
}

/**
 * Tournaments: set one up (an official format or a custom one), enter people
 * and bots, then play it round by round. Matches with a person are played on
 * the table; bot matches are settled in the background and can be watched.
 */
export function TournamentView({
  packId,
  cards,
  decks,
  onClose,
  onPlay,
  onWatch,
  openId,
}: {
  packId: string
  cards: AsCard[]
  decks: DeckOption[]
  onClose: () => void
  /** Play a match's next game on the table. */
  onPlay: (row: TournamentRow, match: Match, game: NewGame) => void
  onWatch: (game: NewGame, moves: GameRecord['moves'], title: string, rowId: string) => void
  /** Open this tournament straight away (coming back from the table). */
  openId?: string | null
}) {
  const [rows, setRows] = useState<TournamentRow[] | null>(null)
  const [row, setRow] = useState<TournamentRow | null>(null)
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    void listTournaments(packId).then((r) => {
      setRows(r)
      if (openId) setRow(r.find((x) => x.id === openId) ?? null)
    })
  }, [packId, openId])
  const store = async (next: TournamentRow) => {
    setRow(next)
    await saveTournament(next)
  }

  const title = row ? row.name : creating ? 'New tournament' : 'Tournaments'
  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-40 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Tournaments"
      data-testid="tournament-view"
    >
      <header className="app-topbar flex shrink-0 items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton
          label="Back"
          onClick={() => {
            if (row || creating) {
              setRow(null)
              setCreating(false)
              void listTournaments(packId).then(setRows)
            } else onClose()
          }}
        >
          <ArrowLeft />
        </IconButton>
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {row ? (
            <Running row={row} cards={cards} store={store} onPlay={onPlay} onWatch={onWatch} />
          ) : creating ? (
            <Setup
              packId={packId}
              cards={cards}
              decks={decks}
              onStart={async (spec, entrants) => {
                const t = createTournament(spec, entrants, randomSeed())
                const r: TournamentRow = {
                  id: newId(),
                  packId,
                  name: spec.name,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  t,
                }
                setCreating(false)
                await store(r)
              }}
            />
          ) : (
            <>
              <Button onClick={() => setCreating(true)} data-testid="tournament-new">
                <Plus /> New tournament
              </Button>
              {rows?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No tournaments yet. Start one with the official formats from Locals to the World
                  Championship, or a custom one.
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {rows?.map((r) => (
                  <li
                    key={r.id}
                    className="flex min-h-11 items-center gap-2 rounded-lg border bg-panel px-2 py-1"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{r.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.t.done
                          ? `Finished · won by ${r.t.entrants.find((e) => e.id === placings(r.t)[0])?.name}`
                          : `${STAGE_NAMES[r.t.spec.stages[r.t.stage].kind]}, round ${r.t.round}`}{' '}
                        · {new Date(r.updatedAt).toLocaleString()}
                      </span>
                    </span>
                    <IconButton
                      label="Delete"
                      onClick={async () => {
                        if (
                          await askConfirm({
                            title: `Delete ${r.name}?`,
                            okLabel: 'Delete',
                            danger: true,
                          })
                        ) {
                          await deleteTournament(r.id)
                          setRows(await listTournaments(packId))
                        }
                      }}
                    >
                      <Trash2 />
                    </IconButton>
                    <Button size="sm" variant="secondary" onClick={() => setRow(r)}>
                      {r.t.done ? 'Results' : 'Continue'}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const PRESET_IDS: PresetId[] = ['locals', 'regionals', 'nationals', 'proTour', 'worlds']
const BOT_NAMES_POOL = [
  'Aria',
  'Bram',
  'Cass',
  'Dorian',
  'Elsa',
  'Finn',
  'Greta',
  'Hale',
  'Isolde',
  'Jory',
  'Kael',
  'Lyra',
  'Milo',
  'Nessa',
  'Orin',
  'Pell',
  'Quinn',
  'Rhea',
  'Soren',
  'Tess',
  'Ulric',
  'Vera',
  'Wren',
  'Xan',
  'Yara',
  'Zed',
  'Ash',
  'Briar',
  'Cole',
  'Dax',
  'Echo',
  'Fern',
]

type DeckSource = 'pack' | 'suboptimal' | 'optimal' | 'mixed'

function Setup({
  packId,
  cards,
  decks,
  onStart,
}: {
  packId: string
  cards: AsCard[]
  decks: DeckOption[]
  onStart: (spec: TournamentSpec, entrants: Entrant[]) => void
}) {
  const byId = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards])
  const legalDecks = useMemo(() => decks.filter((d) => checkDeck(d.cards, byId).ok), [decks, byId])
  const [preset, setPreset] = useState<PresetId | 'custom'>('locals')
  const [length, setLength] = useState<Length>('format')
  const [opening, setOpening] = useState<'rps' | 'coin'>('rps')
  const [custom, setCustom] = useState<Custom>('swissCut')
  const [players, setPlayers] = useState(8)
  const [extra, setExtra] = useState({ rounds: 3, cut: 4, groups: 2, advance: 2 })
  const base = preset === 'custom' ? customSpec(custom, players, extra) : PRESETS[preset]
  const spec: TournamentSpec = { ...withLength(base, length), opening }
  const [entrants, setEntrants] = useState<Entrant[]>([])
  const [person, setPerson] = useState({ name: 'You', deck: legalDecks[0]?.id ?? '' })
  const [level, setLevel] = useState<BotLevel>('normal')
  const [source, setSource] = useState<DeckSource>('mixed')
  const [busy, setBusy] = useState<string | null>(null)

  const addPerson = () => {
    const d = legalDecks.find((x) => x.id === person.deck)
    if (!d) return toast('Pick a legal deck first.')
    setEntrants((e) => [
      ...e,
      {
        id: newId(),
        name: person.name.trim() || 'Player',
        bot: null,
        deck: d.cards,
        deckName: d.name,
      },
    ])
  }
  const fillBots = async () => {
    const need = spec.players - entrants.length
    if (need <= 0) return
    setBusy('Getting the bots ready…')
    try {
      const wantsValues = source !== 'pack'
      const values = wantsValues ? await cardValues(packId, cards) : null
      const used = new Set(entrants.map((e) => e.name))
      const names = BOT_NAMES_POOL.filter((n) => !used.has(n))
      const made: Entrant[] = []
      // Pack decks are handed out in turn.
      let packPicks = entrants.length
      for (let i = 0; i < need; i++) {
        const kind: DeckSource =
          source === 'mixed' ? (['pack', 'suboptimal', 'optimal'] as const)[i % 3] : source
        let deck: string[]
        let deckName: string
        if (kind === 'pack' || !values) {
          const d = legalDecks[packPicks++ % Math.max(1, legalDecks.length)]
          if (!d) throw new Error('There is no legal deck to give the bots.')
          deck = d.cards
          deckName = d.name
        } else {
          deck = buildDeck(cards, values, kind, randomSeed()).cards
          deckName = kind === 'optimal' ? 'Optimal (auto)' : 'Suboptimal (auto)'
        }
        made.push({
          id: newId(),
          name: names[i] ?? `Bot ${entrants.length + i + 1}`,
          bot: level,
          deck,
          deckName,
        })
      }
      setEntrants((e) => [...e, ...made])
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }
  const full = entrants.length === spec.players

  return (
    <div className="flex flex-col gap-4" data-testid="tournament-setup">
      <section className="flex flex-col gap-2 rounded-xl border bg-panel p-3">
        <Label htmlFor="tn-format">Format</Label>
        <NativeSelect
          id="tn-format"
          value={preset}
          onChange={(e) => {
            const p = e.target.value as PresetId | 'custom'
            setPreset(p)
            setLength('format')
          }}
          data-testid="tournament-format"
        >
          {PRESET_IDS.map((p) => (
            <option key={p} value={p}>
              {PRESETS[p].name}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </NativeSelect>
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <NativeSelect
              aria-label="Custom format"
              value={custom}
              onChange={(e) => setCustom(e.target.value as Custom)}
            >
              <option value="roundRobin">Round robin</option>
              <option value="swissCut">Swiss, then a top cut</option>
              <option value="groupsKo">Groups, then a knockout</option>
              <option value="knockout">Single elimination</option>
            </NativeSelect>
            <label className="flex items-center gap-2 text-sm">
              Players
              <Input
                type="number"
                min={2}
                max={64}
                value={players}
                onChange={(e) => setPlayers(Math.max(2, Math.min(64, Number(e.target.value) || 2)))}
                className="w-20"
              />
            </label>
            {custom === 'swissCut' && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  Rounds
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    value={extra.rounds}
                    onChange={(e) =>
                      setExtra((x) => ({ ...x, rounds: Number(e.target.value) || 1 }))
                    }
                    className="w-20"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  Top cut
                  <NativeSelect
                    value={extra.cut}
                    onChange={(e) => setExtra((x) => ({ ...x, cut: Number(e.target.value) }))}
                  >
                    {[0, 2, 4, 8, 16].map((n) => (
                      <option key={n} value={n}>
                        {n ? `Top ${n}` : 'None'}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </>
            )}
            {custom === 'groupsKo' && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  Groups
                  <Input
                    type="number"
                    min={2}
                    max={8}
                    value={extra.groups}
                    onChange={(e) =>
                      setExtra((x) => ({ ...x, groups: Number(e.target.value) || 2 }))
                    }
                    className="w-20"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  Go on per group
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={extra.advance}
                    onChange={(e) =>
                      setExtra((x) => ({ ...x, advance: Number(e.target.value) || 1 }))
                    }
                    className="w-20"
                  />
                </label>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NativeSelect
            aria-label="Match length"
            value={length}
            onChange={(e) => setLength(e.target.value as Length)}
            data-testid="tournament-length"
          >
            <option value="format">Match length: as the format</option>
            <option value="1">Best of 1</option>
            <option value="3">Best of 3</option>
            <option value="3f5">Best of 3, final best of 5</option>
          </NativeSelect>
          <NativeSelect
            aria-label="Initiative in game 1"
            value={opening}
            onChange={(e) => setOpening(e.target.value as 'rps' | 'coin')}
          >
            <option value="rps">Game 1: rock-paper-scissors</option>
            <option value="coin">Game 1: random initiative</option>
          </NativeSelect>
        </div>
        <p className="text-xs text-muted-foreground" data-testid="tournament-summary">
          {describeSpec(spec)}. In a longer match, the player who went second in a game starts the
          next one with the initiative.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border bg-panel p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            Entrants {entrants.length} / {spec.players}
          </span>
          {entrants.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setEntrants([])}>
              Clear
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Person's name"
            className="w-32"
            value={person.name}
            onChange={(e) => setPerson((p) => ({ ...p, name: e.target.value }))}
          />
          <NativeSelect
            aria-label="Person's deck"
            className="w-auto min-w-40"
            value={person.deck}
            onChange={(e) => setPerson((p) => ({ ...p, deck: e.target.value }))}
          >
            {legalDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
          <Button
            size="sm"
            variant="secondary"
            disabled={full}
            onClick={addPerson}
            data-testid="tournament-add-person"
          >
            <Users /> Add a person
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <NativeSelect
            aria-label="Bot level"
            className="w-auto"
            value={level}
            onChange={(e) => setLevel(e.target.value as BotLevel)}
          >
            {BOT_LEVELS.map((l) => (
              <option key={l} value={l}>
                {BOT_NAMES[l]} bots{l === 'hard' ? ' (slow)' : ''}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Bot decks"
            className="w-auto"
            value={source}
            onChange={(e) => setSource(e.target.value as DeckSource)}
          >
            <option value="mixed">Mixed decks</option>
            <option value="pack">Pack and saved decks</option>
            <option value="suboptimal">Suboptimal (auto-built)</option>
            <option value="optimal">Optimal (auto-built)</option>
          </NativeSelect>
          <Button
            size="sm"
            variant="secondary"
            disabled={full || !!busy}
            onClick={() => void fillBots()}
            data-testid="tournament-fill"
          >
            <Plus /> Fill with bots
          </Button>
        </div>
        {busy && <p className="text-xs text-muted-foreground">{busy}</p>}
        <ol className="flex flex-col gap-0.5 text-sm" data-testid="tournament-entrants">
          {entrants.map((e, i) => (
            <li
              key={e.id}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 hover:bg-muted"
            >
              <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {e.name}{' '}
                <span className="text-xs text-muted-foreground">
                  {e.bot ? `${BOT_NAMES[e.bot]} bot` : 'person'} · {e.deckName}
                </span>
              </span>
              <IconButton
                label={`Remove ${e.name}`}
                size="icon-sm"
                onClick={() => setEntrants((x) => x.filter((y) => y.id !== e.id))}
              >
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ol>
      </section>
      <Button
        disabled={!full}
        onClick={() => onStart(spec, entrants)}
        data-testid="tournament-start"
      >
        <Trophy /> Start {spec.name}
      </Button>
      {!full && (
        <p className="-mt-2 text-xs text-muted-foreground">
          {spec.players - entrants.length > 0
            ? `${spec.players - entrants.length} more to enter.`
            : `${entrants.length - spec.players} too many.`}
        </p>
      )}
    </div>
  )
}

function stageTitle(t: Tournament, stage: number, round: number): string {
  const spec = t.spec.stages[stage]
  if (spec.kind === 'knockout') {
    const left = t.matches.filter((m) => m.stage === stage && m.round === round).length
    return left === 1
      ? 'Final'
      : left === 2
        ? 'Semifinals'
        : left === 4
          ? 'Quarterfinals'
          : `Knockout round ${round}`
  }
  if (spec.kind === 'swiss') return `Swiss round ${round} of ${spec.rounds ?? 3}`
  return `${STAGE_NAMES[spec.kind]}, round ${round}`
}

function Running({
  row,
  cards,
  store,
  onPlay,
  onWatch,
}: {
  row: TournamentRow
  cards: AsCard[]
  store: (r: TournamentRow) => Promise<void>
  onPlay: (row: TournamentRow, match: Match, game: NewGame) => void
  onWatch: (game: NewGame, moves: GameRecord['moves'], title: string, rowId: string) => void
}) {
  const t = row.t
  const [busy, setBusy] = useState<number | null>(null)
  const name = (id: string | null) =>
    id ? (t.entrants.find((e) => e.id === id)?.name ?? '?') : 'Bye'
  const isBot = (id: string | null) => !!id && !!t.entrants.find((e) => e.id === id)?.bot
  const round = currentMatches(t)
  const openBots = round.filter((m) => m.winner === null && botMatch(t, m))
  const simulate = async () => {
    setBusy(0)
    try {
      await store({ ...row, t: await simulateRound(t, cards, setBusy) })
    } catch (e) {
      toast(`Couldn't settle the bot matches: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }
  const watch = (m: Match, g: GameRecord, n: number) =>
    onWatch(
      {
        cards,
        decks: [
          t.entrants.find((e) => e.id === m.a)!.deck,
          t.entrants.find((e) => e.id === m.b)!.deck,
        ],
        names: [name(m.a), name(m.b)],
        seed: g.seed,
        ...(g.initiative !== undefined ? { initiative: g.initiative } : { opening: g.opening }),
      },
      g.moves,
      `${row.name}: ${name(m.a)} vs ${name(m.b)}, game ${n + 1}`,
      row.id,
    )
  const report = () => {
    const lines = [`# ${row.name}`, '', describeSpec(t.spec), '']
    if (t.done) {
      lines.push('## Placings', '')
      placings(t).forEach((id, i) => {
        const e = t.entrants.find((x) => x.id === id)!
        lines.push(
          `${i + 1}. ${e.name} (${e.bot ? `${BOT_NAMES[e.bot]} bot` : 'person'}, ${e.deckName})`,
        )
      })
    }
    lines.push('', '## Matches', '')
    for (const m of t.matches) {
      const [sa, sb] = score(m)
      lines.push(`- ${stageTitle(t, m.stage, m.round)}: ${name(m.a)} ${sa}–${sb} ${name(m.b)}`)
    }
    return lines.join('\n')
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report())
      toast('Tournament report copied.')
    } catch {
      toast('Could not copy the report.')
    }
  }
  const stageIds = (stage: number) => {
    const ids = new Set(
      t.matches.filter((m) => m.stage === stage).flatMap((m) => [m.a, m.b ?? m.a]),
    )
    return t.seeding.filter((id) => ids.has(id))
  }
  const spec = t.spec.stages[t.stage]

  return (
    <div className="flex flex-col gap-3" data-testid="tournament-running">
      <p className="text-xs text-muted-foreground">{describeSpec(t.spec)}</p>
      {t.done ? (
        <section className="rounded-xl border bg-panel p-3" data-testid="tournament-results">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            <span className="font-semibold">Results</span>
            <span className="flex-1" />
            <Button size="sm" variant="secondary" onClick={() => void copy()}>
              <Copy /> Copy report
            </Button>
          </div>
          <ol className="flex flex-col gap-0.5 text-sm">
            {placings(t).map((id, i) => {
              const e = t.entrants.find((x) => x.id === id)!
              return (
                <li key={id} className={cn('flex gap-2', i === 0 && 'font-semibold')}>
                  <span className="w-6 text-right tabular-nums">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">
                    {e.name}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      {e.bot ? `${BOT_NAMES[e.bot]} bot` : 'person'} · {e.deckName}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      ) : (
        <section className="flex flex-col gap-2 rounded-xl border bg-panel p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold" data-testid="tournament-round">
              {stageTitle(t, t.stage, t.round)}
            </span>
            <span className="text-xs text-muted-foreground">
              {matchLabel(round[0] ?? ({ bestOf: spec.bestOf } as Match))}
            </span>
            <span className="flex-1" />
            {openBots.length > 0 && (
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => void simulate()}
                data-testid="tournament-simulate"
              >
                <Zap />{' '}
                {busy !== null
                  ? `Playing… ${Math.round(busy * 100)}%`
                  : `Settle ${openBots.length} bot match${openBots.length === 1 ? '' : 'es'}`}
              </Button>
            )}
          </div>
          <MatchList
            matches={round}
            name={name}
            isBot={isBot}
            onPlay={(m) => onPlay(row, m, nextGame(t, m, cards, nextGameStart(t, m)))}
            onWatch={watch}
          />
        </section>
      )}
      {t.spec.stages.map((s, stage) => {
        const ms = t.matches.filter((m) => m.stage === stage)
        if (!ms.length) return null
        if (s.kind === 'knockout') {
          const rounds = [...new Set(ms.map((m) => m.round))]
          return (
            <section
              key={stage}
              className="rounded-xl border bg-panel p-3"
              data-testid="tournament-bracket"
            >
              <div className="mb-2 text-sm font-semibold">Knockout</div>
              <div className="flex gap-3 overflow-x-auto">
                {rounds.map((r) => (
                  <div key={r} className="flex min-w-44 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{stageTitle(t, stage, r)}</span>
                    <MatchList
                      matches={ms.filter((m) => m.round === r)}
                      name={name}
                      isBot={isBot}
                      onWatch={watch}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          )
        }
        const tables =
          s.kind === 'groups'
            ? t.groups.map((g, i) => ({
                title: `Group ${String.fromCharCode(65 + i)}`,
                rows: standings(t, stage, g, i),
              }))
            : [{ title: STAGE_NAMES[s.kind], rows: standings(t, stage, stageIds(stage)) }]
        return (
          <section
            key={stage}
            className="rounded-xl border bg-panel p-3"
            data-testid="tournament-standings"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {tables.map((tb) => (
                <div key={tb.title}>
                  <div className="mb-1 text-sm font-semibold">{tb.title}</div>
                  <table className="w-full text-xs tabular-nums">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="text-left font-normal">#</th>
                        <th className="text-left font-normal">Player</th>
                        <th className="font-normal">W–L</th>
                        <th className="font-normal">Pts</th>
                        <th className="font-normal" title="Opponents' match-win %">
                          OMW
                        </th>
                        <th className="font-normal" title="Game-win %">
                          GW
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tb.rows.map((r, i) => (
                        <tr key={r.id}>
                          <td>{i + 1}</td>
                          <td className="max-w-36 truncate">{name(r.id)}</td>
                          <td className="text-center">
                            {r.wins}–{r.losses}
                          </td>
                          <td className="text-center font-semibold">{r.points}</td>
                          <td className="text-center">{Math.round(r.omw * 100)}%</td>
                          <td className="text-center">{Math.round(r.gw * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function MatchList({
  matches,
  name,
  isBot,
  onPlay,
  onWatch,
  compact,
}: {
  matches: Match[]
  name: (id: string | null) => string
  isBot: (id: string | null) => boolean
  onPlay?: (m: Match) => void
  onWatch: (m: Match, g: GameRecord, n: number) => void
  compact?: boolean
}) {
  return (
    <ul className="flex flex-col gap-1" data-testid="tournament-matches">
      {matches.map((m) => {
        const [sa, sb] = score(m)
        const person = !isBot(m.a) || (m.b !== null && !isBot(m.b))
        return (
          <li
            key={m.id}
            className={cn(
              'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2 py-1 text-sm',
              compact && 'text-xs',
            )}
          >
            <span className={cn('min-w-0 flex-1 truncate', m.winner === m.a && 'font-semibold')}>
              {name(m.a)}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {m.b === null ? 'bye' : `${sa}–${sb}`}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-right',
                m.winner !== null && m.winner === m.b && 'font-semibold',
              )}
            >
              {m.b === null ? '' : name(m.b)}
            </span>
            {!compact && m.winner === null && person && onPlay && (
              <Button size="sm" onClick={() => onPlay(m)} data-testid="tournament-play">
                <Play /> {m.games.length ? `Game ${m.games.length + 1}` : 'Play'}
              </Button>
            )}
            {m.b !== null && m.games.length > 0 && (
              <span className="flex gap-0.5">
                {m.games.map((g, n) => (
                  <IconButton
                    key={n}
                    size="icon-sm"
                    label={`Watch game ${n + 1}`}
                    onClick={() => onWatch(m, g, n)}
                    data-testid="tournament-watch"
                  >
                    {m.games.length === 1 ? (
                      <Eye />
                    ) : (
                      <span className="text-[11px] font-semibold">G{n + 1}</span>
                    )}
                  </IconButton>
                ))}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
