import { ArrowLeft, CircleHelp, Plus, Redo2, ScrollText, Trophy, Undo2 } from '@/ui/icons'
import { useEffect, useState } from 'react'
import { askConfirm } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import { Sheet } from '@/ui/components/ui/sheet'
import { useBackHandler, useEscapeToClose } from '@/ui/components/overlay'
import { actor } from '@/adventure/engine'
import { ActionBar } from './ActionBar'
import { DeckBuilder } from '../decks/DeckBuilder'
import { CardZoom } from './CardZoom'
import { LogPanel } from './LogPanel'
import { StartPanel } from './StartPanel'
import { TableCanvas } from './TableCanvas'
import { Tracker } from './Tracker'
import { usePack } from './packContext'
import { RulesBar } from './RulesBar'
import { useBotDriver } from './useBotDriver'
import { usePlaytest } from './usePlaytest'
import { ZoneSheet } from './ZoneSheet'

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
  // Only when two people share the device (a bot needs no hand-over).
  const twoPeople = !bots[0] && !bots[1]
  const handOver =
    rules && twoPeople && viewer !== null && toAct !== null && toAct !== viewer ? toAct : null
  const driver = useBotDriver()
  const playing = !!setup && !!state && ownPack
  const [zone, setZone] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(!phone)
  const [winSeen, setWinSeen] = useState<string | null>(null)
  const [decksOpen, setDecksOpen] = useState(false)
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
      if (isTyping(e.target) || document.querySelector('[role="dialog"][data-state="open"]')) return
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
    usePlaytest.getState().end()
  }

  const winner = state?.winner
  const winKey = winner ? `${winner.seat}:${state!.log.length}` : null
  return (
    <div className="h-app pt-safe flex flex-col bg-background" aria-label="Playtest">
      <header className="app-topbar flex shrink-0 flex-wrap items-center gap-2 border-b bg-panel px-2 py-2">
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
            <UndoRedo />
            <IconButton label="Game log" active={logOpen} onClick={() => setLogOpen((o) => !o)}>
              <ScrollText />
            </IconButton>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void newGame()}
              aria-label="New game"
            >
              <Plus /> <span className="hidden sm:inline">New game</span>
            </Button>
          </>
        )}
      </header>
      {!playing ? (
        <StartPanel key={deckRev} onDecks={() => setDecksOpen(true)} />
      ) : (
        <>
          <Tracker phone={phone} />
          <div className="flex min-h-0 flex-1">
            <div className="relative flex min-w-0 flex-1 flex-col">
              <TableCanvas onOpenZone={setZone} />
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
              {winner && winKey !== winSeen && (
                <div
                  className="absolute bottom-3 left-3 z-[400] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-3 rounded-xl border bg-panel px-4 py-2 shadow-xl"
                  role="status"
                >
                  <Trophy className="size-5 text-amber-500" />
                  <span className="text-sm font-semibold">
                    {winner.seat === null ? 'The table' : setup.seats[winner.seat]?.name} wins!
                  </span>
                  <span className="text-xs text-muted-foreground">{winner.reason}</span>
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
          {rules ? (
            <RulesBar onZoom={setZoom} botToAct={driver.botToAct} onBotStep={driver.step} />
          ) : (
            <>
              <ActionBar onZoom={setZoom} />
              {!hasSelection && <div className="pb-safe bg-canvas" />}
            </>
          )}
          {phone && (
            <Sheet open={logOpen} onOpenChange={setLogOpen} side="bottom" title="Game log" tall>
              <LogPanel />
            </Sheet>
          )}
          <ZoneSheet zone={zone} onClose={() => setZone(null)} phone={phone} />
          <CardZoom pieceId={zoom} onClose={() => setZoom(null)} />
        </>
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
