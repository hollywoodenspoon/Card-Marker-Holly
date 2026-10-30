import { isActive } from '@/app/workspace'
import {
  ArrowLeft,
  CircleHelp,
  Download,
  Eye,
  Film,
  Plus,
  Redo2,
  ScrollText,
  FlaskConical,
  Trophy,
  Undo2,
} from '@/ui/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { askConfirm } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import { Sheet } from '@/ui/components/ui/sheet'
import { useBackHandler, useEscapeToClose } from '@/ui/components/overlay'
import { actor, type Move, type NewGame } from '@/adventure/engine'
import { recordGame } from '@/adventure/tournament/tournament'
import {
  listDecks,
  playtestDb,
  saveTournament,
  type ReplayRow,
  type RushRow,
} from '@/playtest/library'
import { presets } from '@/playtest/setup'
import { ActionBar } from './ActionBar'
import { ActionCallout } from './ActionCallout'
import { ActionFeed } from './ActionFeed'
import { Flights } from './Flights'
import { HoverZoom } from './HoverZoom'
import { Spotlight } from './Spotlight'
import { CardPreview } from './CardPreview'
import { CombatStage } from './CombatStage'
import { stagedIds, useStage } from './useStage'
import { DeckBuilder } from '../decks/DeckBuilder'
import { useDeckCards } from '../decks/useDeckCards'
import { firstInitiative } from '../tournament/tournamentClient'
import { TournamentView, type DeckOption } from '../tournament/TournamentView'
import { CardZoom } from './CardZoom'
import { LogPanel } from './LogPanel'
import { StartPanel } from './StartPanel'
import { TableCanvas } from './TableCanvas'
import { Tracker } from './Tracker'
import { exportReplay } from './replayFile'
import { usePack } from './packContext'
import { ReplayBar } from './ReplayBar'
import { keepReplay } from './replays'
import { ReplaysView } from './ReplaysView'
import { RulesBar } from './RulesBar'
import { RushView } from './RushView'
import { BalanceLab } from '../lab/BalanceLab'
import type { RushRun } from './rushTally'
import { useBotDriver, useFrameTimer } from './useBotDriver'
import { usePlaytest } from './usePlaytest'
import { ZoneSheet } from './ZoneSheet'
import { WorkspaceSwitch } from '@/ui/shell/WorkspaceSwitch'

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/**
 * A pack's table: a game played by hand, or Adventure Scuffle with the rules
 * on. The layout comes from a game setup (zones, card states, tokens, counters).
 */
export function GameView({
  phone,
  onBack,
  onHelp,
}: {
  phone: boolean
  onBack: () => void
  onHelp: () => void
}) {
  const pack = usePack()
  const setup = usePlaytest((s) => s.setup)
  const state = usePlaytest((s) => s.state)
  const ownPack = usePlaytest((s) => s.packId === pack.id)
  const viewer = usePlaytest((s) => s.viewer)
  const hasSelection = usePlaytest((s) => !!s.selected)
  const rules = usePlaytest((s) => s.rules)
  // Hot-seat: the table is shown to one player at a time; hand it over when the other must act.
  const toAct = rules ? actor(rules) : null
  const bots = usePlaytest((s) => s.bots)
  // A game resumed from before replays existed has no record of its start.
  const hasStart = usePlaytest((s) => !!s.game)
  // Only when two people share the device (a bot needs no hand-over).
  const twoPeople = !bots[0] && !bots[1]
  const showing = usePlaytest((s) => !!s.playback)
  // The hand-over waits until the last move has been shown.
  const handOver =
    rules && twoPeople && !showing && viewer !== null && toAct !== null && toAct !== viewer
      ? toAct
      : null
  const driver = useBotDriver()
  useFrameTimer()
  const stage = useStage()
  const stageHidden = usePlaytest((s) => s.stageHidden)
  const staged = useMemo(() => (stageHidden ? undefined : stagedIds(stage)), [stage, stageHidden])
  const [preview, setPreview] = useState<string | null>(null)
  const playing = !!setup && !!state && ownPack
  const [zone, setZone] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(!phone)
  const [winSeen, setWinSeen] = useState<string | null>(null)
  const [decksOpen, setDecksOpen] = useState(false)
  const replay = usePlaytest((s) => s.replay)
  // The Replays list or a Rush batch, over everything (and where a replay goes back to).
  type Screen =
    | { k: 'replays' }
    | { k: 'rush'; run?: RushRun; row?: RushRow }
    | { k: 'tournaments'; openId?: string }
    | { k: 'lab' }
    | null
  const [screen, setScreen] = useState<Screen>(null)
  const [afterReplay, setAfterReplay] = useState<Screen>(null)
  const watch = (game: NewGame, moves: Move[], title: string, back: Screen) => {
    const asSetup = presets(pack.info.cardSize).find((x) => x.id === 'preset:adventure-scuffle')!
    setPreview(null)
    setScreen(null)
    setAfterReplay(back)
    usePlaytest.getState().watch(asSetup, game, moves, title)
  }
  const leaveReplay = () => {
    usePlaytest.getState().leaveReplay()
    setPreview(null)
    setScreen(afterReplay)
  }
  /** Save the open rules game (finished or not) as a replay file. */
  const exportThisGame = () => {
    const { game, moves, bots: b } = usePlaytest.getState()
    if (game)
      exportReplay(
        { game, moves: moves.flat(), bots: b, source: b.some(Boolean) ? 'bot' : 'play' },
        pack.info.name,
      )
  }
  const watchThisGame = async () => {
    await keepReplay()
    const { game, moves, rules: r } = usePlaytest.getState()
    if (game && r) watch(game, moves.flat(), `${r.players[0].name} vs ${r.players[1].name}`, null)
  }
  // A tournament match being played on the table: its result is recorded when the game ends.
  // Remembered on this device, so a reload mid-game still records the result.
  const [tourney, setTourneyState] = useState<TourneyGame | null>(() => loadTourney(pack.id))
  const setTourney = (t: TourneyGame | null) => {
    setTourneyState(t)
    saveTourney(pack.id, t)
  }

  // The game last recorded, so a re-render doesn't record it twice.
  const recorded = useRef<string | null>(null)
  const deckCards = useDeckCards()
  const packPremades = useMemo(
    () =>
      pack.info.decks.map((d) => ({
        name: d.name,
        cards: Object.entries(d.counts).flatMap(([id, n]) => Array<string>(n).fill(id)),
      })),
    [pack],
  )
  const [deckOptions, setDeckOptions] = useState<DeckOption[]>([])
  useEffect(() => {
    if (screen?.k !== 'tournaments') return
    void listDecks(pack.id).then((rows) =>
      setDeckOptions([
        ...rows.map((d) => ({ id: d.id, name: d.name, cards: d.cards })),
        ...pack.info.decks.map((d, i) => ({
          id: `pack:${i}`,
          name: d.name,
          cards: Object.entries(d.counts)
            .filter(([, n]) => n > 0)
            .map(([id]) => id),
        })),
      ]),
    )
  }, [screen, pack])
  useEffect(() => {
    const w = rules?.winner
    if (!tourney || !w) return
    const key = `${tourney.matchId}#${tourney.game.seed}`
    const pt = usePlaytest.getState()
    if (recorded.current === key || pt.replay || pt.game?.seed !== tourney.game.seed) return
    recorded.current = key
    void (async () => {
      const row = await playtestDb().tournaments.get(tourney.id)
      if (!row) return
      const moves = pt.moves.flat()
      const g = tourney.game
      const t = recordGame(row.t, tourney.matchId, {
        seed: g.seed,
        first: firstInitiative(g, moves),
        ...(g.initiative !== undefined ? { initiative: g.initiative } : { opening: g.opening }),
        winner: w.seat,
        moves,
        points: [rules.players[0].points, rules.players[1].points],
        rounds: rules.round,
      })
      await saveTournament({ ...row, t })
    })()
  }, [rules, tourney])
  // Remounts the start panel after the Decks screen, so new decks are listed.
  const [deckRev, setDeckRev] = useState(0)

  // Escape lets go of the selection (it never leaves the game); Android's Back
  // does that too, then goes back to the pack list.
  const deselect = () => {
    const pt = usePlaytest.getState()
    if (pt.placing) pt.select(pt.selected)
    else if (pt.selected) pt.select(null)
    else return false
    return true
  }
  useEscapeToClose(() => void deselect())
  useBackHandler(() => void (deselect() || onBack()))

  // Undo / redo and F to flip, while no dialog is open and not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActive('play') || isTyping(e.target)) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      const pt = usePlaytest.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') pt[e.shiftKey ? 'redo' : 'undo']()
      else if (mod && key === 'y') pt.redo()
      else if (!mod && key === 'f' && pt.selected?.kind === 'piece' && !pt.rules)
        pt.act({ t: 'flip', piece: pt.selected.id })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const newGame = async () => {
    if (
      !(await askConfirm({
        title: 'Start a new game?',
        description: 'The table is cleared. Copy the game log first if you want to keep it.',
        okLabel: 'New game',
      }))
    )
      return
    // A game left after its first round is kept as a replay.
    const r = usePlaytest.getState().rules
    if (r && !r.winner && r.round > 1) await keepReplay()
    usePlaytest.getState().end()
  }

  const winner = state?.winner
  const winKey = winner ? `${winner.seat}:${state!.log.length}` : null
  return (
    <div className="h-app pt-safe flex flex-col bg-background" aria-label="Playtest">
      <header className="app-topbar flex shrink-0 flex-wrap items-center gap-2 border-b bg-panel px-2 py-2">
        <WorkspaceSwitch />
        <IconButton label="Back to your game packs" onClick={onBack}>
          <ArrowLeft />
        </IconButton>
        <div className="min-w-0 truncate text-sm font-semibold">{pack.info.name}</div>
        <IconButton label="How to play (F1)" onClick={onHelp}>
          <CircleHelp />
        </IconButton>
        {playing && (
          <>
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">
              {setup.name}
            </span>
            <span className="flex-1" />
            <NativeSelect
              aria-label="Show the table to"
              className="w-auto"
              value={viewer ?? ''}
              onChange={(e) =>
                usePlaytest
                  .getState()
                  .setViewer(e.target.value === '' ? null : Number(e.target.value))
              }
              data-testid="playtest-viewer"
            >
              <option value="">Everyone sees all</option>
              {setup.seats.map((s, i) => (
                <option key={i} value={i}>
                  {s.name}'s view
                </option>
              ))}
            </NativeSelect>
            {!replay && <UndoRedo />}
            <IconButton label="Game log" active={logOpen} onClick={() => setLogOpen((o) => !o)}>
              <ScrollText />
            </IconButton>
            {!replay && rules && hasStart && (
              <IconButton
                label="Save this game as a replay file"
                onClick={exportThisGame}
                data-testid="game-export"
              >
                <Download />
              </IconButton>
            )}
            {!replay && (
              <IconButton label="Replays" onClick={() => setScreen({ k: 'replays' })}>
                <Film />
              </IconButton>
            )}
            {!replay && deckCards.adventure && (
              <IconButton label="Tournaments" onClick={() => setScreen({ k: 'tournaments' })}>
                <Trophy />
              </IconButton>
            )}
            {!replay && deckCards.adventure && (
              <IconButton label="Balance lab" onClick={() => setScreen({ k: 'lab' })}>
                <FlaskConical />
              </IconButton>
            )}
            {!replay && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void newGame()}
                aria-label="New game"
              >
                <Plus /> <span className="hidden sm:inline">New game</span>
              </Button>
            )}
          </>
        )}
      </header>
      {!playing ? (
        <StartPanel
          key={deckRev}
          onDecks={() => setDecksOpen(true)}
          onReplays={() => setScreen({ k: 'replays' })}
          onRush={(run) => setScreen({ k: 'rush', run })}
          onTournaments={() => setScreen({ k: 'tournaments' })}
          onLab={() => setScreen({ k: 'lab' })}
        />
      ) : (
        <>
          <Tracker phone={phone} />
          {/* Its own stacking context: the table's overlays stay under the full-screen views. */}
          <div className="isolate flex min-h-0 flex-1">
            <div className="relative flex min-w-0 flex-1 flex-col">
              <TableCanvas onOpenZone={setZone} onPreview={setPreview} staged={staged} />
              {stage && <CombatStage stage={stage} onPreview={setPreview} />}
              <ActionFeed />
              <Flights />
              <HoverZoom />
              <Spotlight />
              <ActionCallout
                onPreview={setPreview}
                onLog={phone ? () => setLogOpen(true) : undefined}
              />
              <CardPreview
                pieceId={preview}
                phone={phone}
                onClose={() => setPreview(null)}
                onEnlarge={setZoom}
              />
              {handOver !== null && (
                <div
                  className="absolute inset-0 z-[500] grid place-items-center bg-canvas p-4"
                  data-testid="rules-handover"
                >
                  <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border bg-panel p-5 text-center shadow-xl">
                    <span
                      className="size-4 rounded-full"
                      style={{ background: setup.seats[handOver]?.color }}
                    />
                    <p className="text-base font-semibold">
                      Pass the device to {setup.seats[handOver]?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The table stays hidden until they're ready, so nobody sees the other player's
                      cards.
                    </p>
                    <Button
                      onClick={() => usePlaytest.getState().setViewer(handOver)}
                      data-testid="rules-handover-ok"
                    >
                      I'm {setup.seats[handOver]?.name}: show my side
                    </Button>
                  </div>
                </div>
              )}
              {winner && winKey !== winSeen && !replay && (
                <div
                  className="absolute bottom-3 left-3 z-[400] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-3 rounded-xl border bg-panel px-4 py-2 shadow-xl"
                  role="status"
                >
                  <Trophy className="size-5 text-amber-500" />
                  <span className="text-sm font-semibold">
                    {winner.seat === null ? 'The table' : setup.seats[winner.seat]?.name} wins!
                  </span>
                  <span className="text-xs text-muted-foreground">{winner.reason}</span>
                  {tourney && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setScreen({ k: 'tournaments', openId: tourney.id })
                        setTourney(null)
                      }}
                      data-testid="back-to-tournament"
                    >
                      <Trophy /> Back to the tournament
                    </Button>
                  )}
                  {rules && usePlaytest.getState().game && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void watchThisGame()}
                      data-testid="watch-this-game"
                    >
                      <Eye /> Watch replay
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setWinSeen(winKey)}>
                    Keep playing
                  </Button>
                </div>
              )}
            </div>
            {logOpen && !phone && (
              <aside
                className="flex w-72 shrink-0 flex-col border-l bg-panel"
                aria-label="Game log"
              >
                <LogPanel />
              </aside>
            )}
          </div>
          {replay ? (
            <ReplayBar onLeave={leaveReplay} />
          ) : rules ? (
            <RulesBar onZoom={setZoom} botToAct={driver.botToAct} onBotStep={driver.step} />
          ) : (
            <>
              <ActionBar onZoom={setZoom} />
              {!hasSelection && <div className="pb-safe bg-canvas" />}
            </>
          )}
          {phone && (
            <Sheet
              open={logOpen && !screen}
              onOpenChange={setLogOpen}
              side="bottom"
              title="Game log"
              tall
            >
              <LogPanel />
            </Sheet>
          )}
          <ZoneSheet zone={zone} onClose={() => setZone(null)} phone={phone} />
          <CardZoom pieceId={zoom} onClose={() => setZoom(null)} />
        </>
      )}
      {screen?.k === 'replays' && (
        <ReplaysView
          packId={pack.id}
          onClose={() => setScreen(null)}
          onWatch={(r: ReplayRow) =>
            watch(r.game, r.moves, `${r.names[0]} vs ${r.names[1]}`, { k: 'replays' })
          }
          onRush={(row) => setScreen({ k: 'rush', row })}
        />
      )}
      {screen?.k === 'tournaments' && (
        <TournamentView
          key={screen.openId ?? 'list'}
          packId={pack.id}
          cards={deckCards.cards}
          decks={deckOptions}
          openId={screen.openId}
          onClose={() => setScreen(null)}
          onWatch={(game, moves, title, rowId) =>
            watch(game, moves, title, { k: 'tournaments', openId: rowId })
          }
          onPlay={(row, m, game) => {
            const a = row.t.entrants.find((e) => e.id === m.a)!
            const b = row.t.entrants.find((e) => e.id === m.b)!
            const asSetup = presets(pack.info.cardSize).find(
              (x) => x.id === 'preset:adventure-scuffle',
            )!
            setPreview(null)
            setScreen(null)
            setTourney({ id: row.id, matchId: m.id, game })
            usePlaytest.getState().startRules(pack.id, asSetup, game, {
              hotseat: !a.bot && !b.bot,
              bots: [a.bot, b.bot],
            })
          }}
        />
      )}
      {screen?.k === 'lab' && (
        <BalanceLab
          packId={pack.id}
          packName={pack.info.name}
          cards={deckCards.cards}
          premades={packPremades}
          onClose={() => setScreen(null)}
        />
      )}
      {screen?.k === 'rush' && (
        <RushView
          // A new batch, or a saved one: each its own view.
          key={screen.row?.id ?? 'run'}
          run={screen.run}
          row={screen.row}
          onClose={() => setScreen(null)}
          // Back to this batch as saved: coming back must not start a new run.
          onWatch={(game, moves, title, back) =>
            watch(game, moves, title, { k: 'rush', row: back })
          }
        />
      )}
      {decksOpen && (
        <DeckBuilder
          onClose={() => {
            setDecksOpen(false)
            setDeckRev((r) => r + 1)
          }}
        />
      )}
    </div>
  )
}

function UndoRedo() {
  const canUndo = usePlaytest((s) => (s.rules ? s.rulesPast : s.past).length > 0)
  const canRedo = usePlaytest((s) => (s.rules ? s.rulesFuture : s.future).length > 0)
  return (
    <>
      <IconButton
        label="Undo (Ctrl+Z)"
        disabled={!canUndo}
        onClick={() => usePlaytest.getState().undo()}
      >
        <Undo2 />
      </IconButton>
      <IconButton
        label="Redo (Ctrl+Y)"
        disabled={!canRedo}
        onClick={() => usePlaytest.getState().redo()}
      >
        <Redo2 />
      </IconButton>
    </>
  )
}

/** The tournament match a game on the table belongs to. */
interface TourneyGame {
  id: string
  matchId: string
  game: NewGame
}
const tourneyKey = (packId: string) => `hs-tourney-game:${packId}`
function loadTourney(packId: string): TourneyGame | null {
  try {
    return JSON.parse(localStorage.getItem(tourneyKey(packId)) ?? 'null') as TourneyGame | null
  } catch {
    return null
  }
}
function saveTourney(packId: string, t: TourneyGame | null) {
  try {
    if (t) localStorage.setItem(tourneyKey(packId), JSON.stringify(t))
    else localStorage.removeItem(tourneyKey(packId))
  } catch {
    /* storage unavailable */
  }
}
