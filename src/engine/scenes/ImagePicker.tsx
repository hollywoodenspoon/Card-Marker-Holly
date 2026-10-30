import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from '@/ui/icons'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { cn } from '@/lib/cn'
import { useGameCards } from '../cards/gameCards'
import type { ImageRef } from '../model/game'
import { assets } from '../storage/assets'
import type { AssetRow } from '../storage/db'
import { useGame } from '../store/gameStore'
import { imagesChanged, useImageUrl, useImageVersion } from './images'

/** The open game's own pictures (refreshed when one is added or removed). */
export function useGameImages(): AssetRow[] {
  const gameId = useGame((s) => s.game.id)
  const v = useImageVersion((s) => s.v)
  const [rows, setRows] = useState<AssetRow[]>([])
  useEffect(() => {
    let live = true
    void assets.listGame(gameId).then((r) => live && setRows(r))
    return () => {
      live = false
    }
  }, [gameId, v])
  return rows
}

/** Add picture files to the open game. Returns the new ids. */
export async function uploadImages(files: FileList | File[], folder?: string) {
  const gameId = useGame.getState().game.id
  const ids: string[] = []
  for (const f of Array.from(files)) {
    if (!f.type.startsWith('image/')) continue
    ids.push(await assets.putImage(f, f.name.replace(/\.[^.]+$/, ''), gameId, folder))
  }
  imagesChanged()
  return ids
}

export function Thumb({ image, className }: { image: ImageRef; className?: string }) {
  const url = useImageUrl(image)
  return (
    <div
      className={cn(
        'grid aspect-square place-items-center overflow-hidden rounded-md border bg-[#2a2a30]',
        className,
      )}
    >
      {url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}
    </div>
  )
}

/** A dialog listing the game's pictures and the card projects' pictures. */
export function ImagePicker({
  open,
  onClose,
  onPick,
  title = 'Choose a picture',
}: {
  open: boolean
  onClose: () => void
  onPick: (r: ImageRef) => void
  title?: string
}) {
  const own = useGameImages()
  const cardImages = useGameCards((s) => s.cardImages)
  const file = useRef<HTMLInputElement>(null)
  const pick = (r: ImageRef) => {
    onPick(r)
    onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={title} className="max-w-2xl">
        <Button variant="outline" onClick={() => file.current?.click()}>
          <ImagePlus /> Upload pictures…
        </Button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            if (files?.length)
              void uploadImages(files).then((ids) => ids[0] && pick({ store: 'game', id: ids[0] }))
            e.target.value = ''
          }}
        />
        <Grid
          title="Game pictures"
          empty="No pictures yet. Upload one above."
          items={own.map((a) => ({ ref: { store: 'game', id: a.id }, name: a.name }))}
          onPick={pick}
        />
        {Object.keys(cardImages).length > 0 && (
          <Grid
            title="From the card projects"
            items={Object.entries(cardImages).map(([id, a]) => ({
              ref: { store: 'cards', id },
              name: `${a.name} (${a.source})`,
            }))}
            onPick={pick}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Grid({
  title,
  items,
  empty,
  onPick,
}: {
  title: string
  items: { ref: ImageRef; name: string }[]
  empty?: string
  onPick: (r: ImageRef) => void
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {items.length === 0 && empty && <p className="text-sm text-muted-foreground">{empty}</p>}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((it) => (
          <li key={`${it.ref.store}:${it.ref.id}`}>
            <button
              type="button"
              className="w-full space-y-1 rounded-md p-1 text-left hover:bg-muted"
              onClick={() => onPick(it.ref)}
            >
              <Thumb image={it.ref} />
              <span className="block truncate text-xs">{it.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
