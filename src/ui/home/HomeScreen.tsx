import {
  Download,
  FolderCog,
  FolderOpen,
  FolderSearch,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from '@/ui/icons'
import { useEffect, useState } from 'react'
import { APP_NAME, VERSION_LABEL } from '@/app/appInfo'
import { openProject } from '@/app/session'
import { openHelp } from '@/help/openHelp'
import { UpdateButton } from '@/ui/pwa/UpdateButton'
import { SettingsMenu } from '@/ui/settings/SettingsMenu'
import { pathLabel } from '@/platform/desktop'
import { folderStore, getBackend } from '@/storage'
import type { ProjectEntry } from '@/storage/backend'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Input } from '@/ui/components/ui/input'
import { toast } from '@/ui/components/feedback'
import { NewProjectDialog } from './NewProjectDialog'
import { exportStoredProject, importProjectFromFile } from '@/ui/actions/projectFileActions'

const fail = (what: string, e: unknown) =>
  toast(`${what}: ${e instanceof Error ? e.message : String(e)}`, { tone: 'error' })

export function HomeScreen() {
  const [projects, setProjects] = useState<ProjectEntry[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<ProjectEntry | null>(null)
  const [deleting, setDeleting] = useState<ProjectEntry | null>(null)
  const [deleteFiles, setDeleteFiles] = useState(false)
  // Desktop app: projects are folders on disk.
  const folders = folderStore()

  const [importError, setImportError] = useState<string | null>(null)
  const refresh = () => getBackend().listProjects().then(setProjects)
  const doImport = async () => {
    setImportError(null)
    try {
      const id = await importProjectFromFile()
      if (id) await openProject(id)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    }
  }
  const openFolder = async () => {
    if (!folders) return
    const dir = await folders.bridge.pickFolder({
      title: 'Open a project folder',
      defaultPath: await folders.projectsDir(),
    })
    if (!dir) return
    try {
      await openProject(await folders.addFolder(dir))
    } catch (e) {
      fail('Could not open this folder', e)
    }
  }
  const open = async (p: ProjectEntry) => {
    if (!p.missing) return void (await openProject(p.id))
    if (!folders) return
    const dir = await folders.bridge.pickFolder({ title: `Where is “${p.name}” now?` })
    if (!dir) return
    try {
      await folders.relocate(p.id, dir)
      await openProject(p.id)
    } catch (e) {
      fail('Could not use this folder', e)
    }
  }
  const changeProjectsFolder = async () => {
    if (!folders) return
    const dir = await folders.bridge.pickFolder({
      title: 'Where should new projects go?',
      defaultPath: await folders.projectsDir(),
    })
    if (!dir) return
    await folders.setProjectsDir(dir)
    toast(`New projects go to ${pathLabel(dir)}`)
  }
  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="h-app pt-safe pb-safe flex flex-col overflow-auto">
      <header className="app-topbar flex h-14 shrink-0 items-center gap-2 border-b bg-panel px-3">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-7" />
        <span className="text-sm font-semibold">{APP_NAME}</span>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Menu">
              <Menu />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {folders && (
              <DropdownMenuItem onSelect={() => void changeProjectsFolder()}>
                <FolderCog /> Projects folder…
              </DropdownMenuItem>
            )}
            <SettingsMenu onHelp={() => openHelp()} />
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {importError && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
          >
            Import failed: {importError}
          </p>
        )}
        {projects && projects.length === 0 ? (
          <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-accent-soft">
              <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-10" />
            </div>
            <h1 className="text-xl font-semibold">Design your first card</h1>
            <p className="text-sm text-muted-foreground">
              Pick a card size and you get a ready-made layout. Fill in a name, drop in some art,
              and you're done.{' '}
              {folders
                ? 'Each project is saved as a folder of ordinary files on this computer.'
                : 'Everything is saved in this browser.'}
            </p>
            <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
              <Plus /> Start a new project
            </Button>
            {folders && (
              <Button variant="ghost" onClick={openFolder}>
                <FolderOpen /> Open a project folder
              </Button>
            )}
            <Button variant="ghost" onClick={doImport}>
              <Upload /> Import a project file
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h1 className="text-lg font-semibold">Projects</h1>
              <div className="flex flex-wrap justify-end gap-2">
                {folders && (
                  <Button variant="outline" onClick={openFolder}>
                    <FolderOpen /> Open folder
                  </Button>
                )}
                <Button variant="outline" onClick={doImport}>
                  <Upload /> Import
                </Button>
                <Button onClick={() => setCreating(true)}>
                  <Plus /> New project
                </Button>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects?.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-1 rounded-xl border bg-panel p-1 pl-3"
                >
                  <button
                    type="button"
                    onClick={() => void open(p)}
                    title={p.location && pathLabel(p.location)}
                    className="flex min-h-14 min-w-0 flex-1 flex-col items-start justify-center text-left"
                  >
                    <span className="w-full truncate text-sm font-medium">{p.name}</span>
                    {p.missing ? (
                      <span className="text-xs text-danger">
                        Folder not found · click to locate it
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {p.defaultSize &&
                          `${p.defaultSize.widthMm} × ${p.defaultSize.heightMm} mm · `}
                        edited {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                    {p.location && (
                      <span className="w-full truncate text-xs text-muted-foreground">
                        {pathLabel(p.location)}
                      </span>
                    )}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label={`Options for ${p.name}`}>
                        <MoreHorizontal />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {p.missing ? (
                        <DropdownMenuItem onSelect={() => void open(p)}>
                          <FolderSearch /> Locate folder…
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onSelect={() => setRenaming(p)}>
                            <Pencil /> Rename
                          </DropdownMenuItem>
                          {folders && p.location && folders.bridge.canReveal !== false && (
                            <DropdownMenuItem
                              onSelect={() => void folders.bridge.reveal(p.location!)}
                            >
                              <FolderOpen /> Show in folder
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() =>
                              void exportStoredProject(p.id).catch((e) => fail('Export failed', e))
                            }
                          >
                            <Download /> Export backup file
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        danger
                        onSelect={() => {
                          setDeleteFiles(false)
                          setDeleting(p)
                        }}
                      >
                        <Trash2 /> {folders ? 'Remove…' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 px-4 pb-3 text-center text-xs text-muted-foreground">
        <span>
          {APP_NAME} {VERSION_LABEL}
        </span>
        <UpdateButton />
      </footer>

      <NewProjectDialog open={creating} onOpenChange={setCreating} />
      <RenameDialog
        project={renaming}
        onClose={() => setRenaming(null)}
        onDone={async (name) => {
          if (renaming)
            await getBackend()
              .renameProject(renaming.id, name)
              .catch((e) => fail('Rename failed', e))
          setRenaming(null)
          void refresh()
        }}
      />
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent
          title={folders ? 'Remove project?' : 'Delete project?'}
          description={
            folders
              ? `“${deleting?.name}” is taken off this list. Its folder stays on disk unless you tick the box.`
              : `“${deleting?.name}” and all its cards, templates, images and fonts will be removed from this browser.`
          }
        >
          {folders && deleting?.location && !deleting.missing && (
            <label className="flex min-h-11 items-start gap-2 text-sm md:min-h-8">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-accent"
                checked={deleteFiles}
                onChange={(e) => setDeleteFiles(e.target.checked)}
              />
              <span>
                {folders.bridge.hasTrash === false
                  ? 'Also delete the folder and everything in it from this device'
                  : 'Also move the folder to the Trash'}
                <span className="block text-xs break-all text-muted-foreground">
                  {pathLabel(deleting.location)}
                </span>
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (deleting)
                  await getBackend()
                    .deleteProject(deleting.id, { deleteFiles })
                    .catch((e) => fail('Could not delete', e))
                setDeleting(null)
                void refresh()
              }}
            >
              {folders && !deleteFiles ? 'Remove from list' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RenameDialog({
  project,
  onClose,
  onDone,
}: {
  project: ProjectEntry | null
  onClose: () => void
  onDone: (name: string) => void
}) {
  return (
    <Dialog open={!!project} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Rename project">
        {project && (
          <RenameForm key={project.id} initial={project.name} onClose={onClose} onDone={onDone} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({
  initial,
  onClose,
  onDone,
}: {
  initial: string
  onClose: () => void
  onDone: (name: string) => void
}) {
  const [name, setName] = useState(initial)
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onDone(name.trim() || 'Untitled')
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        aria-label="Project name"
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  )
}
