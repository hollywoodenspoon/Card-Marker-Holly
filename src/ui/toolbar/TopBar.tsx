import {
  Dices,
  Download,
  Highlighter,
  LayoutGrid,
  LayoutTemplate,
  Library,
  Type,
  TextSearch,
  FolderOpen,
  Home,
  Image,
  Menu,
  PanelLeft,
  PanelRight,
  Printer,
  Redo2,
  Undo2,
  PenTool,
  Ruler,
  Sheet,
} from 'lucide-react'
import { APP_NAME, APP_VERSION } from '@/app/appInfo'
import { goHome } from '@/app/session'
import { folderStore } from '@/storage'
import { redo, undo, useEditor } from '@/core/editor/editorStore'
import { Button, IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import type { LayoutKind } from '@/ui/shell/useLayout'
import { exportOpenProject } from '@/ui/actions/projectFileActions'
import { InstallMenuItem } from '@/ui/pwa/InstallMenuItem'
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
        <AppMenu phone={phone} />
        <ProjectName className={phone ? 'max-w-[38vw]' : undefined} />
        <SaveIndicator compact={phone} />
        <div className="flex-1" />
        {!phone && (
          <div className="flex items-center gap-2 px-2">
            <ModeSwitch />
            <AddMenu />
            <Button size="sm" variant="outline" onClick={() => useUi.getState().setPrintOpen(true)}>
              <Printer /> Print
            </Button>
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

function AppMenu({ phone }: { phone: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Menu">
          <Menu />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => useUi.getState().setPrintOpen(true)}>
          <Printer /> Print / export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => useUi.getState().setGalleryOpen(true)}>
          <LayoutGrid /> Gallery and proofreading
        </DropdownMenuItem>
        {phone && (
          <>
            <DropdownMenuItem onSelect={() => useUi.getState().setPhoneSheet('templates')}>
              <LayoutTemplate /> Templates
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => useUi.getState().setPhoneSheet('decks')}>
              <Library /> Decks
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => useUi.getState().setPhoneSheet('fonts')}>
              <Type /> Fonts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onSelect={() =>
            useUi.getState().setImageExport({ cardId: useEditor.getState().view.cardId })
          }
        >
          <Image /> Export card images…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => useUi.getState().setTtsOpen(true)}>
          <Dices /> Export for Tabletop Simulator…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => useUi.getState().setKeywordsOpen(true)}>
          <Highlighter /> Keywords…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => useUi.getState().setVectorOpen({ assetId: null })}>
          <PenTool /> Vector Maker
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => useUi.getState().setDataView('table')}>
          <Sheet /> Card data (table, CSV, mail merge)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => useUi.getState().setFindOpen(true)}>
          <TextSearch /> Find and replace…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => useUi.getState().setUnitsOpen(true)}>
          <Ruler /> Units…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void goHome()}>
          <Home /> All projects
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void exportOpenProject()}>
          <Download /> Export backup file
        </DropdownMenuItem>
        <ShowFolderMenuItem />
        <InstallMenuItem />
        <DropdownMenuSeparator />
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {APP_NAME} {APP_VERSION}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Desktop app: open the project's folder in the file manager. */
function ShowFolderMenuItem() {
  const folders = folderStore()
  if (!folders || folders.bridge.canReveal === false) return null
  return (
    <DropdownMenuItem
      onSelect={async () => {
        const id = useEditor.getState().doc?.project.id
        const dir = id && (await folders.locationOf(id))
        if (dir) await folders.bridge.reveal(dir)
      }}
    >
      <FolderOpen /> Show project folder
    </DropdownMenuItem>
  )
}
