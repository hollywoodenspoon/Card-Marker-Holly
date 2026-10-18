import { Download, Menu, MoreHorizontal, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createAndOpenProject, openProject } from '@/app/session'
import type { Project } from '@/core/model/types'
import { SIZE_PRESETS } from '@/core/units/presets'
import { deleteProject, listProjects, renameProject } from '@/storage/repo'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { exportStoredProject, importProjectFromFile } from '@/ui/actions/projectFileActions'
import { InstallMenuItem } from '@/ui/pwa/InstallMenuItem'
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu'

export function HomeScreen() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  const [importError, setImportError] = useState<string | null>(null)
  const refresh = () => listProjects().then(setProjects)
  const doImport = async () => {
    setImportError(null)
    try {
      const id = await importProjectFromFile()
      if (id) await openProject(id)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    }
  }
  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="h-app pt-safe pb-safe flex flex-col overflow-auto">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-panel px-3">
        <img src="/icon.svg" alt="" className="size-7" />
        <span className="text-sm font-semibold">Card Maker</span>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Settings">
              <Menu />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <InstallMenuItem />
            <ThemeMenuItems />
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
              <img src="/icon.svg" alt="" className="size-10" />
            </div>
            <h1 className="text-xl font-semibold">Design your first card</h1>
            <p className="text-sm text-muted-foreground">
              Start with an 86 × 54 mm card and a ready-made layout. Fill in a name, drop in some
              art, and you're done. Everything is saved in this browser.
            </p>
            <Button
              onClick={() => createAndOpenProject('My card game')}
              className="w-full sm:w-auto"
            >
              <Plus /> Start a new project
            </Button>
            <Button variant="ghost" onClick={() => setCreating(true)}>
              Choose a different card size…
            </Button>
            <Button variant="ghost" onClick={doImport}>
              <Upload /> Import a project file
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h1 className="text-lg font-semibold">Projects</h1>
              <div className="flex gap-2">
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
                    onClick={() => openProject(p.id)}
                    className="flex min-h-14 min-w-0 flex-1 flex-col items-start justify-center text-left"
                  >
                    <span className="w-full truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.defaultSize.widthMm} × {p.defaultSize.heightMm} mm · edited{' '}
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label={`Options for ${p.name}`}>
                        <MoreHorizontal />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setRenaming(p)}>
                        <Pencil /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void exportStoredProject(p.id)}>
                        <Download /> Export backup file
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem danger onSelect={() => setDeleting(p)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <NewProjectDialog open={creating} onOpenChange={setCreating} />
      <RenameDialog
        project={renaming}
        onClose={() => setRenaming(null)}
        onDone={async (name) => {
          if (renaming) await renameProject(renaming.id, name)
          setRenaming(null)
          void refresh()
        }}
      />
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent
          title="Delete project?"
          description={`“${deleting?.name}” and all its cards, templates, images and fonts will be removed from this browser.`}
        >
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (deleting) await deleteProject(deleting.id)
                setDeleting(null)
                void refresh()
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [name, setName] = useState('My card game')
  const [preset, setPreset] = useState('id')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New project" description="You can change the card size later.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void createAndOpenProject(name.trim() || 'Untitled', preset)
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="np-name">Name</Label>
            <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="np-size">Card size</Label>
            <NativeSelect id="np-size" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {SIZE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} — {p.widthMm} × {p.heightMm} mm
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RenameDialog({
  project,
  onClose,
  onDone,
}: {
  project: Project | null
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
