import {
  Braces,
  ChevronDown,
  Folder,
  FolderInput,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  PenTool,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { groupAssets, type AssetGroup } from '@/assets/folders'
import { updateLibrary, useEditor } from '@/core/editor/editorStore'
import { usedAssetIds } from '@/core/model/usage'
import type { Asset } from '@/core/model/types'
import { cn } from '@/lib/cn'
import {
  addAssetFolder,
  deleteAssetFolder,
  moveAssetsToFolder,
  newAssetFolder,
  renameAssetFolder,
  uploadImages,
} from '@/ui/actions/assetFolders'
import { placeAsset } from '@/ui/actions/imageActions'
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
import { useUi } from '@/ui/uiStore'

const NO_FOLDERS: string[] = []

/** Full Assets panel (phone sheet): upload, hint, folders and images. */
export function AssetsPanel({ onPicked }: { onPicked?: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => uploadImages()}>
            <Upload /> Upload images
          </Button>
          <IconButton
            label="New vector"
            variant="outline"
            onClick={() => useUi.getState().setVectorOpen({ assetId: null })}
          >
            <PenTool />
          </IconButton>
          <IconButton label="New folder" variant="outline" onClick={newAssetFolder}>
            <FolderPlus />
          </IconButton>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          PNG, JPG, WebP or SVG. You can also drop or paste images onto the canvas. Tap an image to
          place it (or to fill the selected art box).
        </p>
      </div>
      <AssetGroups onPicked={onPicked} />
    </div>
  )
}

const CLOSED_KEY = 'cardmaker.closedAssetFolders'
function readClosed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

/** Images grouped into collapsible folders. `compact` is the docked version in the left pane. */
export function AssetGroups({ onPicked, compact }: { onPicked?: () => void; compact?: boolean }) {
  const assets = useEditor((s) => s.library.assets)
  const folders = useEditor((s) => s.doc?.project.assetFolders) ?? NO_FOLDERS
  const groups = useMemo(() => groupAssets(Object.values(assets), folders), [assets, folders])
  const [closed, setClosed] = useState(readClosed)
  const toggle = (f: string) => {
    const next = closed.includes(f) ? closed.filter((x) => x !== f) : [...closed, f]
    setClosed(next)
    try {
      localStorage.setItem(CLOSED_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
  }
  const [deleting, setDeleting] = useState<Asset | null>(null)
  const [moving, setMoving] = useState<Asset | null>(null)
  // Only asked while the delete dialog is open (not a subscription to every edit).
  const doc = deleting ? useEditor.getState().doc : null
  const inUse = deleting && doc ? usedAssetIds(doc).has(deleting.id) : false
  const drag = useAssetDrag()

  const pick = (a: Asset) => {
    if (drag.consumeClick()) return
    placeAsset(a)
    onPicked?.()
  }
  const grid = (g: AssetGroup) => (
    <ul
      className={cn(
        'grid auto-rows-min gap-2',
        compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-2',
      )}
    >
      {g.assets.map((a) => (
        <AssetTile
          key={a.id}
          asset={a}
          compact={compact}
          dragging={drag.state?.id === a.id}
          onPick={() => pick(a)}
          onPointerDown={(e) => drag.start(e, a)}
          onMove={() => setMoving(a)}
          onDelete={() => setDeleting(a)}
        />
      ))}
    </ul>
  )

  const empty = Object.keys(assets).length === 0 && folders.length === 0
  return (
    <div
      className={cn('min-h-0 flex-1 overflow-auto px-3 pb-3', compact && 'px-2 pb-2')}
      data-testid="asset-groups"
    >
      {empty ? (
        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
          No images yet. Upload, or drop or paste images onto the canvas.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) =>
            g.folder === null ? (
              <div
                key="__loose"
                data-asset-folder=""
                className={cn(
                  'rounded-lg',
                  drag.state && drag.state.over === '' && 'outline-2 outline-accent',
                )}
              >
                {grid(g)}
              </div>
            ) : (
              <section key={g.folder} aria-label={`Folder ${g.folder}`}>
                <div
                  data-asset-folder={g.folder}
                  className={cn(
                    'flex items-center gap-1 rounded-lg',
                    drag.state?.over === g.folder && 'bg-accent-soft outline-2 outline-accent',
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={!closed.includes(g.folder)}
                    onClick={() => toggle(g.folder!)}
                    className="flex h-11 min-w-0 flex-1 items-center gap-2 px-1 text-left text-sm md:h-8"
                  >
                    <ChevronDown
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform',
                        closed.includes(g.folder) && '-rotate-90',
                      )}
                    />
                    <Folder className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate font-medium">{g.folder}</span>
                    <span className="text-xs text-muted-foreground">{g.assets.length}</span>
                  </button>
                  <FolderMenu folder={g.folder} />
                </div>
                {!closed.includes(g.folder) && (
                  <div className="pt-1 pl-2">
                    {g.assets.length ? (
                      grid(g)
                    ) : (
                      <p className="px-1 pb-1 text-xs text-muted-foreground">
                        Empty. Drag images here or use ⋯ → Move to folder.
                      </p>
                    )}
                  </div>
                )}
              </section>
            ),
          )}
        </div>
      )}
      {drag.state?.moved && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground shadow"
          style={{ left: drag.state.x + 12, top: drag.state.y + 12 }}
        >
          {drag.state.name}
        </div>
      )}
      <MoveDialog asset={moving} folders={groups} onClose={() => setMoving(null)} />
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent
          title="Delete image?"
          description={
            inUse
              ? 'This image is used on cards or templates. Those places will show an empty box.'
              : 'The image will be removed from this project.'
          }
        >
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const id = deleting!.id
                updateLibrary((l) => void delete l.assets[id])
                setDeleting(null)
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

function AssetTile({
  asset: a,
  compact,
  dragging,
  onPick,
  onPointerDown,
  onMove,
  onDelete,
}: {
  asset: Asset
  compact?: boolean
  dragging: boolean
  onPick: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onMove: () => void
  onDelete: () => void
}) {
  return (
    <li
      className={cn(
        'relative overflow-hidden rounded-lg border bg-muted',
        dragging && 'opacity-50',
      )}
      data-testid="asset-tile"
    >
      <button
        type="button"
        onClick={onPick}
        onPointerDown={onPointerDown}
        className="block aspect-square w-full touch-manipulation"
        title={`Place ${a.name}`}
      >
        <img
          src={assetResolver.getUrl(a.id)}
          alt={a.name}
          className={cn('size-full object-contain', compact ? 'p-1' : 'p-1.5')}
          draggable={false}
        />
        {a.tags[0] && (
          <span className="absolute top-1 left-1 max-w-[90%] truncate rounded bg-accent px-1 font-mono text-[10px] text-accent-foreground">
            {`{${a.tags[0]}}`}
          </span>
        )}
      </button>
      <div className="flex items-center gap-1 border-t bg-panel pl-2">
        <span className={cn('min-w-0 flex-1 truncate', compact ? 'text-[11px]' : 'text-xs')}>
          {a.name}
        </span>
        {!compact && (
          <span className="text-[10px] text-muted-foreground">
            {a.isVector ? 'SVG' : `${a.widthPx}×${a.heightPx}`}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={`Options for ${a.name}`} size="icon-sm">
              <MoreHorizontal />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                const name = prompt('Rename image', a.name)?.trim()
                if (name) updateLibrary((l) => void (l.assets[a.id].name = name))
              }}
            >
              <Pencil /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const v = prompt(
                  'Symbol name — type {name} in any text to show this image inline. Leave empty to remove.',
                  a.tags[0] ?? a.name.toLowerCase().replace(/[^a-z0-9_-]+/g, ''),
                )
                if (v === null) return
                const tag = v
                  .trim()
                  .toLowerCase()
                  .replace(/[{}\s]+/g, '')
                  .replace(/[^a-z0-9_-]/g, '')
                updateLibrary((l) => void (l.assets[a.id].tags = tag ? [tag] : []))
              }}
            >
              <Braces /> Symbol name…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onMove}>
              <FolderInput /> Move to folder…
            </DropdownMenuItem>
            {(a.isVector || a.vectorDoc) && (
              <DropdownMenuItem onSelect={() => useUi.getState().setVectorOpen({ assetId: a.id })}>
                <PenTool /> Edit in Vector Maker
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem danger onSelect={onDelete}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

function FolderMenu({ folder }: { folder: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={`Options for folder ${folder}`} size="icon-sm">
          <MoreHorizontal />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => uploadImages(folder)}>
          <Upload /> Upload here
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            const name = prompt('Rename folder', folder)
            if (name) renameAssetFolder(folder, name)
          }}
        >
          <Pencil /> Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={() => deleteAssetFolder(folder)}>
          <Trash2 /> Delete folder (keeps images)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MoveDialog({
  asset,
  folders,
  onClose,
}: {
  asset: Asset | null
  folders: AssetGroup[]
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const move = (f: string | null) => {
    if (asset) moveAssetsToFolder([asset.id], f)
    setName('')
    onClose()
  }
  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Move to folder" description={asset?.name}>
        <div className="flex flex-col gap-1" role="list" aria-label="Folders">
          {folders.map((g) => (
            <Button
              key={g.folder ?? '__loose'}
              role="listitem"
              variant={(asset?.folder ?? null) === g.folder ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => move(g.folder)}
            >
              <Folder /> {g.folder ?? 'No folder'}
            </Button>
          ))}
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) move(addAssetFolder(name))
          }}
        >
          <Input
            aria-label="New folder name"
            placeholder="New folder"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={!name.trim()}>
            <FolderPlus /> Create and move
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DragState {
  id: string
  name: string
  x: number
  y: number
  moved: boolean
  /** Folder under the pointer ('' = no folder), if any. */
  over?: string
}

/** Drag an image onto a folder (mouse and pen; touch scrolls the list instead). */
function useAssetDrag() {
  const [state, setState] = useState<DragState | null>(null)
  const ref = useRef<DragState | null>(null)
  const swallow = useRef(false)
  const update = (s: DragState | null) => {
    ref.current = s
    setState(s)
  }

  useEffect(() => {
    if (!state) return
    const folderAt = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest('[data-asset-folder]') as HTMLElement | null)
        ?.dataset.assetFolder
    const move = (e: PointerEvent) => {
      const s = ref.current!
      const moved = s.moved || Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6
      update({
        ...s,
        moved,
        x: moved ? e.clientX : s.x,
        y: moved ? e.clientY : s.y,
        over: moved ? folderAt(e.clientX, e.clientY) : undefined,
      })
    }
    const up = (e: PointerEvent) => {
      const s = ref.current!
      if (s.moved) {
        swallow.current = true
        const f = folderAt(e.clientX, e.clientY)
        if (f !== undefined) moveAssetsToFolder([s.id], f || null)
      }
      update(null)
    }
    const cancel = () => update(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
    // Listeners live for the whole drag; state updates inside go through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!state])

  return {
    state,
    start: (e: React.PointerEvent, a: Asset) => {
      if (e.pointerType === 'touch' || e.button !== 0) return
      swallow.current = false
      update({ id: a.id, name: a.name, x: e.clientX, y: e.clientY, moved: false })
    },
    /** True (once) when the click that follows a drag should be ignored. */
    consumeClick: useCallback(() => {
      const s = swallow.current
      swallow.current = false
      return s
    }, []),
  }
}
