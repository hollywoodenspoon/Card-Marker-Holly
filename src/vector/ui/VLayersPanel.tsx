import { ChevronDown, Eye, EyeOff, GripVertical, Lock, LockOpen, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/components/ui/button'
import { useReorder } from '@/ui/components/useReorder'
import { addLayer, deleteLayer, moveLayer, updateItem, updateLayer } from '../actions'
import { selectPaths, useVector } from '../store'

/** Layers (top first) with their objects; drag the grip to reorder layers. */
export function VLayersPanel() {
  const doc = useVector((s) => s.doc)
  const active = useVector((s) => s.activeLayerId)
  const selection = useVector((s) => s.selection)
  const [closed, setClosed] = useState<string[]>([])
  const n = doc.layers.length
  // Rows are shown top first; the document stores bottom first.
  const {
    handleProps,
    rowRef,
    dragging: state,
  } = useReorder((from, to) => moveLayer(n - 1 - from, n - 1 - to))
  const shown = [...doc.layers].reverse()

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Layers
        </span>
        <IconButton label="New layer" size="icon-sm" onClick={addLayer}>
          <Plus />
        </IconButton>
      </div>
      <ul className="px-1 pb-2" aria-label="Vector layers">
        {shown.map((l, i) => {
          const open = !closed.includes(l.id)
          return (
            <li
              key={l.id}
              ref={rowRef(i)}
              className={cn(state?.over === i && state.from !== i && 'border-t-2 border-accent')}
            >
              <div
                className={cn(
                  'flex items-center gap-0.5 rounded-md pr-1',
                  l.id === active && 'bg-accent-soft',
                )}
              >
                <button
                  type="button"
                  aria-label={`Move ${l.name}`}
                  className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground"
                  {...handleProps(i)}
                >
                  <GripVertical className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={open ? `Collapse ${l.name}` : `Expand ${l.name}`}
                  aria-expanded={open}
                  className="flex size-8 shrink-0 items-center justify-center text-muted-foreground"
                  onClick={() =>
                    setClosed(open ? [...closed, l.id] : closed.filter((x) => x !== l.id))
                  }
                >
                  <ChevronDown
                    className={cn('size-4 transition-transform', !open && '-rotate-90')}
                  />
                </button>
                <button
                  type="button"
                  className="min-h-11 min-w-0 flex-1 truncate text-left text-sm font-medium md:min-h-8"
                  onClick={() => useVector.setState({ activeLayerId: l.id })}
                  onDoubleClick={() => {
                    const name = prompt('Layer name', l.name)?.trim()
                    if (name) updateLayer(l.id, { name })
                  }}
                  title="Click to draw on this layer; double-click to rename"
                >
                  {l.name}
                </button>
                <IconButton
                  label={l.visible ? `Hide ${l.name}` : `Show ${l.name}`}
                  size="icon-sm"
                  onClick={() => updateLayer(l.id, { visible: !l.visible })}
                >
                  {l.visible ? <Eye /> : <EyeOff />}
                </IconButton>
                <IconButton
                  label={l.locked ? `Unlock ${l.name}` : `Lock ${l.name}`}
                  size="icon-sm"
                  onClick={() => updateLayer(l.id, { locked: !l.locked })}
                >
                  {l.locked ? <Lock /> : <LockOpen />}
                </IconButton>
                {n > 1 && (
                  <IconButton
                    label={`Delete ${l.name}`}
                    size="icon-sm"
                    onClick={() => deleteLayer(l.id)}
                  >
                    <Trash2 />
                  </IconButton>
                )}
              </div>
              {l.id === active && (
                <label className="flex items-center gap-2 px-9 py-1 text-xs text-muted-foreground">
                  Opacity
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(l.opacity * 100)}
                    onChange={(e) =>
                      updateLayer(l.id, { opacity: Number(e.target.value) / 100 }, `lop:${l.id}`)
                    }
                    aria-label={`${l.name} opacity`}
                    className="w-full accent-accent"
                  />
                </label>
              )}
              {open && (
                <ul className="pl-9" aria-label={`Objects in ${l.name}`}>
                  {[...l.items].reverse().map((it) => (
                    <li
                      key={it.id}
                      className={cn(
                        'flex items-center gap-0.5 rounded-md pr-1',
                        selection.includes(it.id) && 'bg-muted',
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          'min-h-11 min-w-0 flex-1 truncate text-left text-sm md:min-h-7',
                          it.hidden && 'text-muted-foreground',
                        )}
                        onClick={(e) => {
                          useVector.setState({ activeLayerId: l.id })
                          selectPaths(e.shiftKey ? [...new Set([...selection, it.id])] : [it.id])
                        }}
                        onDoubleClick={() => {
                          const name = prompt('Name', it.name)?.trim()
                          if (name) updateItem(it.id, { name })
                        }}
                      >
                        {it.name}
                      </button>
                      <IconButton
                        label={it.hidden ? `Show ${it.name}` : `Hide ${it.name}`}
                        size="icon-sm"
                        onClick={() => updateItem(it.id, { hidden: !it.hidden })}
                      >
                        {it.hidden ? <EyeOff /> : <Eye />}
                      </IconButton>
                      <IconButton
                        label={it.locked ? `Unlock ${it.name}` : `Lock ${it.name}`}
                        size="icon-sm"
                        onClick={() => updateItem(it.id, { locked: !it.locked })}
                      >
                        {it.locked ? <Lock /> : <LockOpen />}
                      </IconButton>
                    </li>
                  ))}
                  {!l.items.length && <li className="py-1 text-xs text-muted-foreground">Empty</li>}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
