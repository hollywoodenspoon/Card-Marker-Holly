import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  Download,
  FilePlus2,
  FolderOpen,
  Gauge,
  Image as ImageIcon,
  Layers,
  Loader2,
  Map as MapIcon,
  Menu,
  PanelLeft,
  PanelRight,
  Play,
  Redo2,
  Settings2,
  SquareStack,
  Undo2,
  Upload,
  Variable,
  Clapperboard,
} from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Sheet } from '@/ui/components/ui/sheet'
import { SettingsMenu } from '@/ui/settings/SettingsMenu'
import { openHelp } from '@/help/openHelp'
import { cn } from '@/lib/cn'
import { ENGINE_VERSION } from '@/app/appInfo'
import { useWorkspace } from '@/app/workspace'
import { useShapeRequest } from '@/vector/shapeRequest'
import { downloadMapFile } from './io/mapFile'
import { tileCountOf } from './model/map'
import { assets } from './storage/assets'
import { importMapFromText } from './storage/mapActions'
import {
  createGame,
  duplicateGame,
  exportGame,
  importGame,
  initEngine,
} from './storage/gameActions'
import { useEngineSaveStatus } from './storage/saveStatus'
import { useEngine } from './store/engineStore'
import { openScene, useGame, type GamePanel as Panel } from './store/gameStore'
import { useEngineShortcuts } from './useEngineShortcuts'
import { ResizablePanel } from '@/ui/components/ResizablePanel'
import { ModeBar } from './panels/ModeBar'
import { PropertiesPanel } from './panels/PropertiesPanel'
import { ToolPanel } from './panels/ToolPanel'
import { ViewportLayout } from './scene/ViewportLayout'
import { useView } from './store/viewStore'
import { WorkspaceSwitch } from '@/ui/shell/WorkspaceSwitch'
import { loadGameCards, useGameCards } from './cards/gameCards'
import { installDeckBridge, rememberGame } from './cards/deckBridge'
import { registerAdventureScuffle } from './modules/adventureScuffle'
import { GamePanel } from './panels/game/GamePanel'
import { ScenesPanel } from './panels/game/ScenesPanel'
import { DecksPanel } from './panels/game/DecksPanel'
import { DeckView } from './panels/game/DeckView'
import { CardsPanel } from './panels/game/CardsPanel'
import { ImagesPanel } from './panels/game/ImagesPanel'
import { VariablesPanel } from './panels/game/VariablesPanel'
import { GamesDialog } from './panels/game/GamesDialog'
import { PictureEditor } from './scenes/PictureEditor'
import { SceneProps } from './scenes/SceneProps'
import { EventsEditor } from './events/EventsEditor'
import { GamePlayer } from './runtime/GamePlayer'
import { playGame } from './runtime/play'
import { Section } from '@/ui/components/fields'

// The Vector Maker (and paper.js) download only when a click area's shape is edited.
const VectorMaker = lazy(() => import('@/vector/ui/VectorMaker'))

registerAdventureScuffle()
installDeckBridge()

const RAIL: { id: Panel; label: string; icon: typeof Layers }[] = [
  { id: 'game', label: 'Game', icon: Settings2 },
  { id: 'scenes', label: 'Scenes', icon: Clapperboard },
  { id: 'decks', label: 'Decks', icon: Layers },
  { id: 'cards', label: 'Cards', icon: SquareStack },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'variables', label: 'Variables', icon: Variable },
  { id: 'map', label: 'Map tools', icon: MapIcon },
]

/** Keeps the game's merged cards loaded: on opening a game, changing its sources, or coming back from Cards. */
function useGameCardsSync() {
  const id = useGame((s) => s.game.id)
  const sources = useGame((s) => JSON.stringify(s.game.sources))
  useEffect(() => {
    rememberGame(id)
    void loadGameCards(useGame.getState().game)
  }, [id, sources])
  useEffect(
    () =>
      useWorkspace.subscribe((s, prev) => {
        if (s.ws !== 'engine' || prev.ws === 'engine') return
        const game = useGame.getState().game
        const cards = useGameCards.getState()
        // Live projects may have changed in Cards; Play may have loaded another game.
        if (cards.gameId !== game.id || game.sources.some((x) => x.kind === 'project'))
          void loadGameCards(game)
      }),
    [],
  )
}

/**
 * The engine's shell: a top bar (file, undo, play, save), the left rail with the
 * game's panels, the open scene or deck in the middle, and the selection's
 * properties on the right (Canva-style). Side panels become sheets on small screens.
 */
export function EngineShell() {
  useEngineShortcuts()
  useGameCardsSync()
  const [gamesOpen, setGamesOpen] = useState(false)
  const [leftSheet, setLeftSheet] = useState(false)
  const [rightSheet, setRightSheet] = useState(false)
  const mapFile = useRef<HTMLInputElement>(null)
  const gameFile = useRef<HTMLInputElement>(null)
  const scene = useGame(openScene)
  const isMap = scene?.kind === 'map'
  const gameName = useGame((s) => s.game.name)
  const shapeOpen = useShapeRequest((s) => !!s.req)

  // Open last session's game (or make one from older maps) and start autosaving.
  useEffect(() => {
    let stop: (() => void) | undefined
    let live = true
    void initEngine().then((s) => {
      if (live) stop = s
      else s()
    })
    return () => {
      live = false
      stop?.()
    }
  }, [])

  const onFile = async (file: File | undefined, kind: 'map' | 'game') => {
    if (!file) return
    try {
      if (kind === 'map') await importMapFromText(await file.text())
      else await importGame(await file.text())
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const left = <LeftPanel />
  const right = <RightPanel />
  return (
    <div className="h-app flex flex-col bg-background text-foreground">
      <header className="app-topbar pt-safe pl-safe pr-safe flex shrink-0 items-center gap-1 border-b bg-panel px-2 py-2 sm:gap-2">
        <WorkspaceSwitch />
        <IconButton label="Panels" className="md:hidden" onClick={() => setLeftSheet(true)}>
          <PanelLeft />
        </IconButton>
        <FileMenu
          isMap={isMap}
          onGames={() => setGamesOpen(true)}
          onImportGame={() => gameFile.current?.click()}
          onImportMap={() => mapFile.current?.click()}
        />
        <span className="hidden text-muted-foreground sm:inline">·</span>
        <button
          type="button"
          className="min-w-0 truncate rounded px-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setGamesOpen(true)}
          data-testid="engine-game-name"
        >
          {gameName}
          {scene ? <span className="hidden sm:inline"> · {scene.name}</span> : null}
        </button>
        <SaveBadge />
        <div className="flex-1" />
        <UndoRedo isMap={isMap} />
        <PlayMenu />
        <IconButton label="Properties" className="lg:hidden" onClick={() => setRightSheet(true)}>
          <PanelRight />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Menu">
              <Menu />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => useView.getState().togglePerf()}>
              <Gauge /> Performance meter
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SettingsMenu onHelp={() => openHelp('engine')} />
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Engine {ENGINE_VERSION}</div>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex min-h-0 flex-1">
        <ResizablePanel
          id="engine-tools"
          side="left"
          as="div"
          initial={300}
          min={240}
          max={560}
          label="panels"
          className="hidden border-r bg-panel md:block"
        >
          {left}
        </ResizablePanel>
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <Centre />
        </main>
        <ResizablePanel
          id="engine-properties"
          side="right"
          as="div"
          initial={300}
          min={240}
          max={560}
          label="properties"
          className="hidden border-l bg-panel lg:block"
        >
          {right}
        </ResizablePanel>
      </div>

      <Sheet open={leftSheet} onOpenChange={setLeftSheet} side="left" title="Panels">
        {left}
      </Sheet>
      <Sheet open={rightSheet} onOpenChange={setRightSheet} side="right" title="Properties">
        {right}
      </Sheet>
      <GamesDialog open={gamesOpen} onClose={() => setGamesOpen(false)} />
      <GamePlayer />
      {shapeOpen && (
        <Suspense fallback={null}>
          <VectorMaker shape />
        </Suspense>
      )}
      <input
        ref={mapFile}
        type="file"
        accept=".hsmap,application/json"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0], 'map')
          e.target.value = ''
        }}
      />
      <input
        ref={gameFile}
        type="file"
        accept=".hsgame,application/json"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0], 'game')
          e.target.value = ''
        }}
      />
    </div>
  )
}

function LeftPanel() {
  const panel = useGame((s) => s.panel)
  const isMap = useGame((s) => openScene(s)?.kind === 'map')
  const items = RAIL.filter((r) => r.id !== 'map' || isMap)
  const shown = panel === 'map' && !isMap ? 'scenes' : panel
  return (
    <div className="flex h-full w-full">
      <nav
        className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r py-2"
        aria-label="Engine panels"
      >
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-label={r.label}
            aria-current={shown === r.id || undefined}
            title={r.label}
            data-testid={`rail-${r.id}`}
            onClick={() => useGame.getState().setPanel(r.id)}
            className={cn(
              'flex w-12 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground',
              shown === r.id && 'bg-accent/15 text-foreground',
            )}
          >
            <r.icon className="size-5" />
            <span className="w-full truncate text-center">{r.label}</span>
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto">
        {shown === 'game' && <GamePanel />}
        {shown === 'scenes' && <ScenesPanel />}
        {shown === 'decks' && <DecksPanel />}
        {shown === 'cards' && <CardsPanel />}
        {shown === 'images' && <ImagesPanel />}
        {shown === 'variables' && <VariablesPanel />}
        {shown === 'map' && <ToolPanel />}
      </div>
    </div>
  )
}

function Centre() {
  const view = useGame((s) => s.view)
  const scene = useGame(openScene)
  const deck = useGame((s) =>
    s.view.kind === 'deck'
      ? s.game.decks.find((d) => d.id === (s.view as { id: string }).id)
      : null,
  )
  const count = useEngine((s) => tileCountOf(s.map))
  if (deck) return <DeckView deck={deck} />
  if (scene?.kind === 'picture') return <PictureEditor key={scene.id} scene={scene} />
  if (scene?.kind === 'map')
    return (
      <>
        <ModeBar />
        <div className="relative min-h-0 flex-1">
          <ViewportLayout />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-panel/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
            {count} tiles
          </div>
        </div>
      </>
    )
  return (
    <div className="grid flex-1 place-items-center p-6 text-center">
      <div className="max-w-sm space-y-3">
        <p className="text-sm text-muted-foreground">
          {view.kind === 'none'
            ? 'Open a scene or a deck from the left, or make a new scene.'
            : 'That is no longer in this game.'}
        </p>
        <Button onClick={() => useGame.getState().setPanel('scenes')}>
          <Clapperboard /> Scenes
        </Button>
      </div>
    </div>
  )
}

function RightPanel() {
  const scene = useGame(openScene)
  const view = useGame((s) => s.view.kind)
  if (scene?.kind === 'picture') return <SceneProps scene={scene} />
  if (scene?.kind === 'map') return <PropertiesPanel />
  if (view === 'deck')
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Use − and + on each card, or Build deck. “Build a deck” in Cause and Effect builds one while
        the game runs.
      </p>
    )
  return <GameEvents />
}

/** Game-wide Cause and Effect ("when the game starts…"). */
function GameEvents() {
  const events = useGame((s) => s.game.events)
  return (
    <aside className="h-full overflow-y-auto" aria-label="Properties">
      <Section title="When the game starts">
        <EventsEditor
          events={events}
          attach="game"
          onChange={(recipe) => useGame.getState().commit((g) => recipe(g.events))}
        />
      </Section>
    </aside>
  )
}

function UndoRedo({ isMap }: { isMap: boolean }) {
  const mapUndo = useEngine((s) => s.canUndo)
  const mapRedo = useEngine((s) => s.canRedo)
  const gameUndo = useGame((s) => s.canUndo)
  const gameRedo = useGame((s) => s.canRedo)
  const target = () => (isMap ? useEngine.getState() : useGame.getState())
  return (
    <>
      <IconButton
        label="Undo"
        disabled={!(isMap ? mapUndo : gameUndo)}
        onClick={() => target().undo()}
      >
        <Undo2 />
      </IconButton>
      <IconButton
        label="Redo"
        disabled={!(isMap ? mapRedo : gameRedo)}
        onClick={() => target().redo()}
      >
        <Redo2 />
      </IconButton>
    </>
  )
}

function PlayMenu() {
  const hasScene = useGame((s) => !!openScene(s))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" data-testid="engine-play">
          <Play /> <span className="hidden sm:inline">Play</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => playGame(false)} data-testid="play-game">
          <Play /> Play the game <kbd className="ml-auto text-xs opacity-60">Space</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasScene}
          onSelect={() => playGame(true)}
          data-testid="play-from-here"
        >
          <Play /> Play from this scene
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => useWorkspace.getState().playGame(useGame.getState().game.id)}
        >
          <SquareStack /> Open the card table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FileMenu({
  isMap,
  onGames,
  onImportGame,
  onImportMap,
}: {
  isMap: boolean
  onGames: () => void
  onImportGame: () => void
  onImportMap: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          File
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => void createGame()}>
          <FilePlus2 /> New game
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onGames}>
          <FolderOpen /> Games…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void duplicateGame(useGame.getState().game.id)}>
          <FilePlus2 /> Duplicate this game
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onImportGame}>
          <Upload /> Import game file…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void exportGame()}>
          <Download /> Export game file
        </DropdownMenuItem>
        {isMap && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onImportMap}>
              <Upload /> Import map file…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void downloadMapFile(useEngine.getState().map, assets)}
            >
              <Download /> Export this map
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SaveBadge() {
  const { status, error } = useEngineSaveStatus()
  const label = status === 'saved' ? 'Saved' : status === 'error' ? 'Not saved' : 'Saving…'
  return (
    <span
      role="status"
      aria-live="polite"
      title={status === 'error' ? `Saving failed: ${error}` : label}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground',
        status === 'error' && 'bg-danger/10 text-danger',
      )}
    >
      {status === 'saved' && <Check className="size-3.5" />}
      {(status === 'saving' || status === 'pending') && (
        <Loader2 className="size-3.5 animate-spin" />
      )}
      {status === 'error' && <AlertCircle className="size-3.5" />}
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
