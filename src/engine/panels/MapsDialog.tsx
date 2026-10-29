import { useEffect, useState } from 'react'
import { Copy, FilePlus2, Trash2 } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Input } from '@/ui/components/ui/input'
import { useEngine } from '../store/engineStore'
import { deleteMap, duplicateMap, newMap, openMap, renameMap } from '../storage/mapActions'
import { maps, type MapSummary } from '../storage/maps'

/** Browse, open, rename, duplicate and delete saved maps. */
export function MapsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Maps" description="Open, rename, duplicate or delete your saved maps.">
        {open && <MapsList onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function MapsList({ onClose }: { onClose: () => void }) {
  const currentId = useEngine((s) => s.map.id)
  // The open map's name lives in the store so the list updates as you rename it.
  const currentName = useEngine((s) => s.map.name)
  const [rows, setRows] = useState<MapSummary[]>([])
  const refresh = () => maps.list().then(setRows)
  useEffect(() => {
    void refresh()
  }, [currentName])

  return (
    <div className="space-y-3">
      <Button onClick={() => void newMap().then(refresh)}>
        <FilePlus2 /> New map
      </Button>
      <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
        {rows.map((m) => {
          const current = m.id === currentId
          return (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-md border bg-panel p-2"
              aria-current={current || undefined}
            >
              <Input
                className="h-9 flex-1"
                defaultValue={current ? currentName : m.name}
                aria-label="Map name"
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== m.name)
                    void renameMap(m.id, e.target.value).then(refresh)
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              {current ? (
                <span className="px-2 text-xs text-accent">Open</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void openMap(m.id).then(onClose)}
                >
                  Open
                </Button>
              )}
              <IconButton
                label="Duplicate"
                size="icon-sm"
                onClick={() => void duplicateMap(m.id).then(refresh)}
              >
                <Copy />
              </IconButton>
              <IconButton
                label="Delete"
                size="icon-sm"
                disabled={rows.length === 1}
                onClick={() => void deleteMap(m.id).then(refresh)}
              >
                <Trash2 />
              </IconButton>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
