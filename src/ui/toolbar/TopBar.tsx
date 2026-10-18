import { Menu, PanelLeft, PanelRight, Redo2, Undo2 } from 'lucide-react'
import { IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import type { LayoutKind } from '@/ui/shell/useLayout'
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu'
import { useUi } from '@/ui/uiStore'

export function TopBar({ layout }: { layout: LayoutKind }) {
  const { setLeftOpen, setRightOpen } = useUi()
  return (
    <header className="pt-safe flex shrink-0 items-center gap-1 border-b bg-panel px-2">
      <div className="flex h-14 min-w-0 flex-1 items-center gap-1 md:h-12">
        {layout === 'tablet' && (
          <IconButton label="Open panels" onClick={() => setLeftOpen(true)}>
            <PanelLeft />
          </IconButton>
        )}
        <AppMenu />
        <span className="truncate px-1 text-sm font-semibold">Card Maker</span>
        <div className="flex-1" />
        <IconButton label="Undo" disabled>
          <Undo2 />
        </IconButton>
        <IconButton label="Redo" disabled>
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
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
