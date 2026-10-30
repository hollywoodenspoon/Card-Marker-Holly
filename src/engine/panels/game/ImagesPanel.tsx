import { useMemo, useRef, useState } from 'react'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { askConfirm } from '@/ui/components/feedback'
import { Folder, ImagePlus, Trash2 } from '@/ui/icons'
import { useGameCards } from '../../cards/gameCards'
import { assets } from '../../storage/assets'
import { Thumb, uploadImages, useGameImages } from '../../scenes/ImagePicker'
import { imagesChanged } from '../../scenes/images'

/** The game's own pictures (upload, rename, folders) and the card projects' pictures. */
export function ImagesPanel() {
  const own = useGameImages()
  const cardImages = useGameCards((s) => s.cardImages)
  const file = useRef<HTMLInputElement>(null)
  const [folder, setFolder] = useState('')
  const folders = useMemo(
    () => [...new Set(own.map((a) => a.folder).filter((f): f is string => !!f))].sort(),
    [own],
  )
  const shown = own.filter((a) => (folder ? a.folder === folder : true))
  return (
    <div
      className="flex flex-col gap-3 p-3"
      onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        void uploadImages(e.dataTransfer.files, folder || undefined)
      }}
    >
      <Button size="sm" variant="outline" onClick={() => file.current?.click()}>
        <ImagePlus /> Upload pictures…
      </Button>
      <input
        ref={file}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Picture files"
        onChange={(e) => {
          if (e.target.files) void uploadImages(e.target.files, folder || undefined)
          e.target.value = ''
        }}
      />
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Folder">
          {['', ...folders].map((f) => (
            <Button
              key={f || 'all'}
              size="sm"
              variant="ghost"
              active={folder === f}
              role="radio"
              aria-checked={folder === f}
              onClick={() => setFolder(f)}
            >
              {f ? <Folder /> : null} {f || 'All'}
            </Button>
          ))}
        </div>
      )}
      {own.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Backgrounds, characters and props for your scenes. Upload or drop pictures here.
        </p>
      )}
      <ul className="flex flex-col gap-2" data-testid="game-images">
        {shown.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <Thumb image={{ store: 'game', id: a.id }} className="size-12 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Input
                aria-label="Picture name"
                className="h-8"
                defaultValue={a.name}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (name && name !== a.name)
                    void assets.update(a.id, { name }).then(imagesChanged)
                }}
              />
              <Input
                aria-label="Folder"
                placeholder="Folder"
                className="h-7 text-xs"
                defaultValue={a.folder ?? ''}
                onBlur={(e) => {
                  const f = e.target.value.trim() || undefined
                  if (f !== a.folder) void assets.update(a.id, { folder: f }).then(imagesChanged)
                }}
              />
            </div>
            <IconButton
              label={`Delete ${a.name}`}
              onClick={async () => {
                const ok = await askConfirm({
                  title: `Delete ${a.name}?`,
                  description: 'Scenes using it show no picture there.',
                  okLabel: 'Delete',
                  danger: true,
                })
                if (ok) await assets.remove(a.id).then(imagesChanged)
              }}
            >
              <Trash2 />
            </IconButton>
          </li>
        ))}
      </ul>
      {Object.keys(cardImages).length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            From the card projects
          </h3>
          <p className="text-xs text-muted-foreground">Read-only: change them in Cards.</p>
          <ul className="grid grid-cols-3 gap-1.5">
            {Object.entries(cardImages).map(([id, a]) => (
              <li key={id} title={`${a.name} (${a.source})`}>
                <Thumb image={{ store: 'cards', id }} />
                <span className="block truncate text-[10px]">{a.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
