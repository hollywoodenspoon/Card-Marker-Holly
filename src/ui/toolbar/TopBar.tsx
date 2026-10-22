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
  Sheet,
  Swords,
  RefreshCw,
} from '@/ui/icons'
import { APP_NAME, VERSION_LABEL } from '@/app/appInfo'
import { goHome } from '@/app/session'
import { openHelp } from '@/help/openHelp'
import { checkNow } from '@/ui/pwa/checkNow'
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
import { SettingsMenu } from '@/ui/settings/SettingsMenu'
import { setEditMode } from '@/ui/panels/editMode'
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
    <header className="app-topbar pt-safe pl-safe pr-safe flex shrink-0 items-center border-b bg-panel">
      <div className="flex h-14 min-w-0 flex-1 items-center gap-1 px-2 md:h-12">
        {layout === 'tablet' && (
          <IconButton label="Open panels" onClick={() => setLeftOpen(true)}>
            <PanelLeft />
          </IconButton>
        )}
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
        <AppMenu phone={phone} />
      </div>
    </header>
  )
}

/**
 * ☰, on the right. What the left rail already offers is only listed here on
 * phones (no rail there); Settings holds Help, Units, Theme and updates.
 */
function AppMenu({ phone }: { phone: boolean }) {
  const ui = useUi.getState
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Menu">
          <Menu />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {phone && (
          <>
            <DropdownMenuItem onSelect={() => ui().setPrintOpen(true)}>
              <Printer /> Print / export PDF
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui().setGalleryOpen(true)}>
              <LayoutGrid /> Gallery and proofreading
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui().setPackOpen(true)}>
              <Swords /> Playtest (export game pack)…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setEditMode('template')
                ui().setPhoneSheet('templates')
              }}
            >
              <LayoutTemplate /> Templates
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui().setPhoneSheet('decks')}>
              <Library /> Decks
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui().setPhoneSheet('fonts')}>
              <Type /> Fonts
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => ui().setImageExport({ cardId: useEditor.getState().view.cardId })}
            >
              <Image /> Export card images…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui().setKeywordsOpen(true)}>
              <Highlighter /> Keywords…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui().setVectorOpen({ assetId: null })}>
              <PenTool /> Vector Maker
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ui().setDataView('table')}>
              <Sheet /> Card data (table, CSV, mail merge)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => ui().setFindOpen(true)}>
          <TextSearch /> Find and replace…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => ui().setTtsOpen(true)}>
          <Dices /> Export for Tabletop Simulator…
        </DropdownMenuItem>
        <ShowFolderMenuItem />
        <DropdownMenuItem onSelect={() => void exportOpenProject()}>
          <Download /> Export backup file
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void goHome()}>
          <Home /> All projects
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SettingsMenu onHelp={() => openHelp()} onUnits={() => ui().setUnitsOpen(true)} />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void checkNow()}>
          <RefreshCw /> Check for updates
        </DropdownMenuItem>
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {APP_NAME} {VERSION_LABEL}
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
