import { ArrowLeft, Plus, Redo2, ScrollText, Trophy, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { HelpButton } from '@/help/HelpButton'
import { askConfirm } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import { Sheet } from '@/ui/components/ui/sheet'
import { useBackHandler, useEscapeToClose } from '@/ui/components/overlay'
import type { LayoutKind } from '@/ui/shell/useLayout'
import { useUi } from '@/ui/uiStore'
import { ActionBar } from './ActionBar'
import { CardZoom } from './CardZoom'
import { LogPanel } from './LogPanel'
import { StartPanel } from './StartPanel'
import { TableCanvas } from './TableCanvas'
import { Tracker } from './Tracker'
import { FacesProvider, useCardFaces } from './useCardFaces'
import { usePlaytest } from './usePlaytest'
import { ZoneSheet } from './ZoneSheet'

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/**
 * Playtest: a table for any game, played by hand. The layout comes from a game
 * setup (zones, card states, tokens, counters); no rules are enforced yet.
 */
export default function PlaytestView({ layout }: { layout: LayoutKind }) {
  const phone = layout === 'phone'
  const projectId = useEditor((s) => s.doc!.project.id)
  const setup = usePlaytest((s) => s.setup)
  const state = usePlaytest((s) => s.state)
  const ownProject = usePlaytest((s) => s.projectId === projectId)
  const viewer = usePlaytest((s) => s.viewer)
  const hasSelection = usePlaytest((s) => !!s.selected)
  const playing = !!setup && !!state && ownProject
  const [zone, setZone] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(!phone)
  const [winSeen, setWinSeen] = useState<string | null>(null)

  // A game from another project doesn't carry over.
  useEffect(() => {
    if (!ownProject && usePlaytest.getState().setup) usePlaytest.getState().end()
  }, [ownProject])

  const close = () => useUi.getState().setPlaytestOpen(false)
  const back = () => {
    const pt = usePlaytest.getState()
    if (pt.placing) return pt.select(pt.selected)
    if (pt.selected) return pt.select(null)
    close()
  }
  useEscapeToClose(back)
  useBackHandler(back)

  // Undo / redo and F to flip, while no dialog is open and not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || document.querySelector('[role="dialog"][data-state="open"]')) return
      const pt = usePlaytest.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') pt[e.shiftKey ? 'redo' : 'undo']()
      else if (mod && key === 'y') pt.redo()
      else if (!mod && key === 'f' && pt.selected?.kind === 'piece')
        pt.act({ t: 'flip', piece: pt.selected.id })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const cardIds = useMemo(
    () => [
      ...Object.values(state?.pieces ?? {}).map((p) => p.cardId),
      ...(setup?.zones.flatMap((z) => (z.background?.cardId ? [z.background.cardId] : [])) ?? []),
    ],
    [state?.pieces, setup],
  )
  const faces = useCardFaces(playing ? cardIds : [])

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
    <div
      className="h-app pt-safe fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Playtest"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton label="Back to editor" onClick={close}>
          <ArrowLeft />
        </IconButton>
        <div className="text-sm font-semibold">Playtest</div>
        <HelpButton topic="playtest" />
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
        <StartPanel />
      ) : (
        <FacesProvider value={faces}>
          <Tracker phone={phone} />
          <div className="flex min-h-0 flex-1">
            <div className="relative flex min-w-0 flex-1 flex-col">
              <TableCanvas onOpenZone={setZone} />
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
          <ActionBar onZoom={setZoom} />
          {!hasSelection && <div className="pb-safe bg-canvas" />}
          {phone && (
            <Sheet open={logOpen} onOpenChange={setLogOpen} side="bottom" title="Game log" tall>
              <LogPanel />
            </Sheet>
          )}
          <ZoneSheet zone={zone} onClose={() => setZone(null)} phone={phone} />
          <CardZoom pieceId={zoom} onClose={() => setZoom(null)} />
        </FacesProvider>
      )}
    </div>
  )
}

function UndoRedo() {
  const canUndo = usePlaytest((s) => s.past.length > 0)
  const canRedo = usePlaytest((s) => s.future.length > 0)
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
