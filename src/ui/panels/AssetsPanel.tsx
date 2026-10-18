import { Braces, MoreHorizontal, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { IMAGE_ACCEPT } from '@/assets/imageAssets'
import { updateLibrary, useEditor } from '@/core/editor/editorStore'
import { usedAssetIds } from '@/core/model/usage'
import type { Asset } from '@/core/model/types'
import { importImages, pickFiles, placeAsset } from '@/ui/actions/imageActions'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'

export function AssetsPanel({ onPicked }: { onPicked?: () => void }) {
  const assets = useEditor((s) => s.library.assets)
  const list = useMemo(
    () => Object.values(assets).sort((a, b) => b.createdAt - a.createdAt),
    [assets],
  )
  const [deleting, setDeleting] = useState<Asset | null>(null)
  const doc = useEditor((s) => s.doc)
  const inUse = deleting && doc ? usedAssetIds(doc).has(deleting.id) : false

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await importImages(await pickFiles(IMAGE_ACCEPT))
          }}
        >
          <Upload /> Upload images
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          PNG, JPG, WebP or SVG. You can also drop or paste images onto the canvas. Tap an image to
          place it (or to fill the selected art box).
        </p>
      </div>
      {list.length ? (
        <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-auto px-3 pb-3 sm:grid-cols-3 lg:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="group relative overflow-hidden rounded-lg border bg-muted">
              <button
                type="button"
                onClick={() => {
                  placeAsset(a)
                  onPicked?.()
                }}
                className="block aspect-square w-full"
                title={`Place ${a.name}`}
              >
                <img
                  src={assetResolver.getUrl(a.id)}
                  alt={a.name}
                  className="size-full object-contain p-1.5"
                  draggable={false}
                />
                {a.tags[0] && (
                  <span className="absolute top-1 left-1 rounded bg-accent px-1 font-mono text-[10px] text-accent-foreground">
                    {`{${a.tags[0]}}`}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-1 border-t bg-panel pl-2">
                <span className="min-w-0 flex-1 truncate text-xs">{a.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {a.isVector ? 'SVG' : `${a.widthPx}×${a.heightPx}`}
                </span>
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
                      Rename
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
                    <DropdownMenuItem danger onSelect={() => setDeleting(a)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No images yet.</p>
      )}
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
