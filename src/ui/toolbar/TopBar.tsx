import { Home, Menu, PanelLeft, PanelRight, Redo2, Undo2 } from 'lucide-react'
import { goHome } from '@/app/session'
import { redo, undo, useEditor } from '@/core/editor/editorStore'
import { IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import type { LayoutKind } from '@/ui/shell/useLayout'
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu'
import { useUi } from '@/ui/uiStore'
import { AddMenu } from './AddMenu'
import { ModeSwitch } from './ModeSwitch'
import { ProjectName } from './ProjectName'
import { SaveIndicator } from './SaveIndicator'

export function TopBar({ layout }: { layout: LayoutKind }) {
  const { setLeftOpen, setRightOpen } = useUi()
  const canUndo = useEditor((s) => s.canUndo)
  const canRedo = useEditor((s) => s.canRedo)
  const phone = layout === 'phone'
  return (
    <header className="pt-safe pl-safe pr-safe flex shrink-0 items-center border-b bg-panel">
      <div className="flex h-14 min-w-0 flex-1 items-center gap-1 px-2 md:h-12">
        {layout === 'tablet' && (
          <IconButton label="Open panels" onClick={() => setLeftOpen(true)}>
            <PanelLeft />
          </IconButton>
        )}
        <AppMenu />
        <ProjectName className={phone ? 'max-w-[38vw]' : undefined} />
        <SaveIndicator compact={phone} />
        <div className="flex-1" />
        {!phone && (
          <div className="flex items-center gap-2 px-2">
            <ModeSwitch />
            <AddMenu />
          </div>
        )}
        <div className="flex-1" />
        <IconButton label="Undo" disabled={!canUndo} onClick={undo}>
          <Undo2 />
        </IconButton>
        <IconButton label="Redo" disabled={!canRedo} onClick={redo}>
          <Redo2 />
        </IconButton>
        {layout === 'tablet' && (
          <IconButton label="Open properties" onClick={() => setRightOpen(true)}>
            <PanelRight />
          </IconButton>
        )}
      </div>
    </header>
  )
}

function AppMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Menu">
          <Menu />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => void goHome()}>
          <Home /> All projects
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
