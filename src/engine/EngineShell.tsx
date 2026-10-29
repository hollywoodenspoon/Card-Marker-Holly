import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Box,
  Check,
  Download,
  FilePlus2,
  FolderOpen,
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
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu'
import { cn } from '@/lib/cn'
import { ENGINE_NAME, ENGINE_VERSION } from '@/app/appInfo'
import { blockCount } from './model/map'
import { downloadMapFile } from './io/mapFile'
import { importMapFromText, initEngineMaps, newMap } from './storage/mapActions'
import { useEngineSaveStatus } from './storage/saveStatus'
import { useEngine } from './store/engineStore'
import { useEngineShortcuts } from './useEngineShortcuts'
import { MapsDialog } from './panels/MapsDialog'
import { ToolPanel } from './panels/ToolPanel'
import { Viewport } from './scene/Viewport'

/** The engine's desktop shell: a top bar (file, undo, save) over the viewport with its tool panel. */
export function EngineShell() {
  useEngineShortcuts()
  const [mapsOpen, setMapsOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const canUndo = useEngine((s) => s.canUndo)
  const canRedo = useEngine((s) => s.canRedo)
  const count = useEngine((s) => blockCount(s.map))
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
    <div className="flex h-dvh flex-col bg-bg text-foreground">
      <header className="app-topbar pt-safe pl-safe pr-safe flex shrink-0 items-center gap-2 border-b bg-panel px-3 py-2">
        <Box className="text-accent" />
        <span className="font-semibold">{ENGINE_NAME}</span>
        <FileMenu onMaps={() => setMapsOpen(true)} onImport={() => fileInput.current?.click()} />
        <span className="mx-1 text-muted-foreground">·</span>
        <span className="min-w-0 truncate text-sm text-muted-foreground">{mapName}</span>
        <SaveBadge />
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
            <ThemeMenuItems />
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {ENGINE_NAME} {ENGINE_VERSION}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex min-h-0 flex-1">
        <ToolPanel />
        <main className="relative min-h-0 flex-1">
          <Viewport />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-panel/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
            {count} blocks
          </div>
        </main>
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
        <DropdownMenuItem onSelect={() => downloadMapFile(useEngine.getState().map)}>
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
