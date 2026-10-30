import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  Download,
  FilePlus2,
  FolderOpen,
  Gauge,
  Loader2,
  Menu,
  Redo2,
  Undo2,
  Upload,
} from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { SettingsMenu } from '@/ui/settings/SettingsMenu'
import { openHelp } from '@/help/openHelp'
import { cn } from '@/lib/cn'
import { ENGINE_VERSION } from '@/app/appInfo'
import { tileCountOf } from './model/map'
import { downloadMapFile } from './io/mapFile'
import { assets } from './storage/assets'
import { importMapFromText, initEngineMaps, newMap } from './storage/mapActions'
import { useEngineSaveStatus } from './storage/saveStatus'
import { useEngine } from './store/engineStore'
import { useEngineShortcuts } from './useEngineShortcuts'
import { ResizablePanel } from '@/ui/components/ResizablePanel'
import { CardSourceMenu } from './panels/CardSourceMenu'
import { MapsDialog } from './panels/MapsDialog'
import { ModeBar } from './panels/ModeBar'
import { PropertiesPanel } from './panels/PropertiesPanel'
import { ToolPanel } from './panels/ToolPanel'
import { ViewportLayout } from './scene/ViewportLayout'
import { useView } from './store/viewStore'
import { WorkspaceSwitch } from '@/ui/shell/WorkspaceSwitch'

/**
 * The engine's shell: a top bar (file, undo, save), then tools on the left, the
 * mode bar over the viewports in the middle, and the selection's properties on
 * the right (Canva-style). Side panels fold away on narrow screens.
 */
export function EngineShell() {
  useEngineShortcuts()
  const [mapsOpen, setMapsOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const canUndo = useEngine((s) => s.canUndo)
  const canRedo = useEngine((s) => s.canRedo)
  const count = useEngine((s) => tileCountOf(s.map))
  const mapName = useEngine((s) => s.map.name)

  // Open last session's map (or seed the demo) and start autosaving.
  useEffect(() => {
    let stop: (() => void) | undefined
    void initEngineMaps().then((s) => (stop = s))
    return () => stop?.()
  }, [])

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      await importMapFromText(await file.text())
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="h-app flex flex-col bg-background text-foreground">
      <header className="app-topbar pt-safe pl-safe pr-safe flex shrink-0 items-center gap-2 border-b bg-panel px-2 py-2">
        <WorkspaceSwitch />
        <FileMenu onMaps={() => setMapsOpen(true)} onImport={() => fileInput.current?.click()} />
        <span className="mx-1 text-muted-foreground">·</span>
        <span className="min-w-0 truncate text-sm text-muted-foreground">{mapName}</span>
        <SaveBadge />
        <span className="mx-1 hidden text-muted-foreground sm:inline">·</span>
        <div className="hidden min-w-0 sm:flex">
          <CardSourceMenu />
        </div>
        <div className="flex-1" />
        <IconButton label="Undo" disabled={!canUndo} onClick={() => useEngine.getState().undo()}>
          <Undo2 />
        </IconButton>
        <IconButton label="Redo" disabled={!canRedo} onClick={() => useEngine.getState().redo()}>
          <Redo2 />
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
            <SettingsMenu onHelp={() => openHelp('workspace')} />
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Engine {ENGINE_VERSION}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex min-h-0 flex-1">
        <ResizablePanel
          id="engine-tools"
          side="left"
          as="div"
          initial={256}
          min={220}
          max={520}
          label="tools"
          className="hidden border-r bg-panel md:block"
        >
          <ToolPanel />
        </ResizablePanel>
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <ModeBar />
          <div className="relative min-h-0 flex-1">
            <ViewportLayout />
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-panel/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
              {count} tiles
            </div>
          </div>
        </main>
        <ResizablePanel
          id="engine-properties"
          side="right"
          as="div"
          initial={256}
          min={220}
          max={520}
          label="properties"
          className="hidden border-l bg-panel lg:block"
        >
          <PropertiesPanel />
        </ResizablePanel>
      </div>

      <MapsDialog open={mapsOpen} onClose={() => setMapsOpen(false)} />
      <input
        ref={fileInput}
        type="file"
        accept=".hsmap,application/json"
        className="hidden"
        onChange={(e) => {
          void onImport(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

function FileMenu({ onMaps, onImport }: { onMaps: () => void; onImport: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          File
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => void newMap()}>
          <FilePlus2 /> New map
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMaps}>
          <FolderOpen /> Open map…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onImport}>
          <Upload /> Import map file…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void downloadMapFile(useEngine.getState().map, assets)}>
          <Download /> Export map file
        </DropdownMenuItem>
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
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground',
        status === 'error' && 'bg-danger/10 text-danger',
      )}
    >
      {status === 'saved' && <Check className="size-3.5" />}
      {(status === 'saving' || status === 'pending') && (
        <Loader2 className="size-3.5 animate-spin" />
      )}
      {status === 'error' && <AlertCircle className="size-3.5" />}
      {label}
    </span>
  )
}
