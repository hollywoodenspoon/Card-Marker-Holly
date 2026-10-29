import { Box, Menu, Redo2, Undo2 } from '@/ui/icons'
import { IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu'
import { ENGINE_NAME, ENGINE_VERSION } from '@/app/appInfo'
import { blockCount } from './model/map'
import { useEngine } from './store/engineStore'
import { Viewport } from './scene/Viewport'

/**
 * The engine's desktop shell: a top bar over a full-bleed 3D viewport. Editing
 * tools and panels arrive in PR2; for now this proves the reused chrome
 * (components, theming) sits around a working Three.js view.
 */
export function EngineShell() {
  const canUndo = useEngine((s) => s.canUndo)
  const canRedo = useEngine((s) => s.canRedo)
  const count = useEngine((s) => blockCount(s.map))
  const mapName = useEngine((s) => s.map.name)
  return (
    <div className="flex h-dvh flex-col bg-bg text-foreground">
      <header className="app-topbar pt-safe pl-safe pr-safe flex shrink-0 items-center gap-2 border-b bg-panel px-3 py-2">
        <Box className="text-accent" />
        <span className="font-semibold">{ENGINE_NAME}</span>
        <span className="text-xs text-muted-foreground">{ENGINE_VERSION}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="min-w-0 truncate text-sm text-muted-foreground">{mapName}</span>
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

      <main className="relative min-h-0 flex-1">
        <Viewport />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-panel/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
          <div className="font-medium text-foreground">{count} blocks</div>
          <div>Drag to orbit · right-drag to pan · scroll to zoom</div>
        </div>
      </main>
    </div>
  )
}
