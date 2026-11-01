import { useState } from 'react'
import { Button, IconButton } from '@/ui/components/ui/button'
import { ImagePlus, X } from '@/ui/icons'
import type { ImageRef } from '../../model/game'
import { ImagePicker, Thumb } from '../../scenes/ImagePicker'

/** A picture setting: a thumbnail, Choose… and Remove. */
export function ImageField({
  value,
  onChange,
  label = 'Picture',
  size = 'size-12',
}: {
  value: ImageRef | null
  onChange: (r: ImageRef | null) => void
  label?: string
  size?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-2">
      {value ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={`Change ${label}`}>
          <Thumb image={value} className={size} />
        </button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <ImagePlus /> {label}…
        </Button>
      )}
      {value && (
        <IconButton label={`Remove ${label}`} size="icon-sm" onClick={() => onChange(null)}>
          <X />
        </IconButton>
      )}
      <ImagePicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(r) => onChange(r)}
        title={`Choose ${label.toLowerCase()}`}
      />
    </div>
  )
}
