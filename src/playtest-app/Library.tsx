import { CircleHelp, Download, FileUp, Menu, Play, Trash2 } from '@/ui/icons'
import { useEffect, useRef, useState } from 'react'
import { PLAYTEST_NAME } from '@/app/appInfo'
import { cn } from '@/lib/cn'
import { addPack, playtestDb, type PackRow } from '@/playtest/library'
import { PACK_EXT } from '@/playtest/pack'
import { askConfirm, toast } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { promptInstall, usePwa } from '@/ui/pwa/pwa'
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu'

/** Your game packs: import a file from Hearthside Cardworks, open one to play, or remove it. */
export function Library({ onOpen, onHelp }: { onOpen: (id: string) => void; onHelp: () => void }) {
  const [packs, setPacks] = useState<PackRow[] | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const canInstall = usePwa((s) => s.canInstall)

  const refresh = () => {
    const db = playtestDb()
    return Promise.all([
      db.packs.orderBy('importedAt').reverse().toArray(),
      db.games.toCollection().primaryKeys(),
    ]).then(([rows, games]) => {
      setPacks(rows)
      setSaved(new Set(games))
    })
  }
  useEffect(() => {
    void refresh()
  }, [])

  const importFiles = async (files: FileList | File[]) => {
    for (const f of files) {
      try {
        const info = await addPack(new Uint8Array(await f.arrayBuffer()))
        toast(`Added ${info.name} (${info.cards.length} cards).`)
      } catch (e) {
        toast(`${f.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    await refresh()
  }

  const remove = async (p: PackRow) => {
    const ok = await askConfirm({
      title: `Remove ${p.name}?`,
      description:
        'The pack and its saved game are removed from this browser. Your Hearthside Cardworks project is not touched.',
      okLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    const db = playtestDb()
    await db.transaction('rw', db.packs, db.games, async () => {
      await db.packs.delete(p.id)
      await db.games.delete(p.id)
    })
    await refresh()
  }

  return (
    <div
      className={cn(
        'h-app pt-safe pb-safe flex flex-col bg-background',
        over && 'ring-4 ring-accent ring-inset',
      )}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        void importFiles(e.dataTransfer.files)
      }}
    >
      <header className="app-topbar flex shrink-0 items-center gap-2 border-b bg-panel px-3 py-2">
        <img src={`${import.meta.env.BASE_URL}playtest/icon.svg`} alt="" className="size-7" />
        <h1 className="text-sm font-semibold">{PLAYTEST_NAME}</h1>
        <span className="flex-1" />
        <IconButton label="How to play (F1)" onClick={onHelp}>
          <CircleHelp />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Menu">
              <Menu />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canInstall && (
              <>
                <DropdownMenuItem onSelect={() => void promptInstall()}>
                  <Download /> Install app
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <ThemeMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-base font-semibold">Your game packs</h2>
            <Button onClick={() => input.current?.click()}>
              <FileUp /> Import game pack
            </Button>
            <input
              ref={input}
              type="file"
              accept={`${PACK_EXT},application/zip`}
              multiple
              hidden
              aria-label="Game pack file"
              onChange={(e) => {
                if (e.target.files) void importFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          {packs?.length === 0 && (
            <div
              className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"
              data-testid="library-empty"
            >
              <p className="mb-2 font-medium text-foreground">No game packs yet</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  In Hearthside Cardworks, press{' '}
                  <span className="font-medium text-foreground">Playtest</span> in the left rail (or
                  ☰ → Playtest).
                </li>
                <li>
                  Choose <span className="font-medium text-foreground">Playtest now</span> to open
                  it here, or <span className="font-medium text-foreground">Save game pack</span> to
                  get a {PACK_EXT} file you can open on any device.
                </li>
                <li>Import the file here (or drop it on this page) and press Play.</li>
              </ol>
            </div>
          )}
          <ul className="flex flex-col gap-2" aria-label="Game packs">
            {packs?.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border bg-panel p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.cardCount} cards · added {new Date(p.importedAt).toLocaleDateString()}
                    {saved.has(p.id) && ' · game in progress'}
                  </div>
                </div>
                <IconButton label={`Remove ${p.name}`} onClick={() => void remove(p)}>
                  <Trash2 />
                </IconButton>
                <Button onClick={() => onOpen(p.id)}>
                  <Play /> {saved.has(p.id) ? 'Continue' : 'Play'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
