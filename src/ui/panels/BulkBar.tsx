import { Copy, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { setAllCopies } from '@/core/editor/projectCommands'
import { useEditor } from '@/core/editor/editorStore'
import { flatten } from '@/core/model/tree'
import type { Id, Side } from '@/core/model/types'
import {
  deleteCards,
  duplicateCards,
  setPartOnCards,
  setTemplateForCards,
} from '@/templates/bulkCommands'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'

/** Actions for the cards chosen in select mode. */
export function BulkBar({ ids, onDone }: { ids: Id[]; onDone: (keep?: Id[]) => void }) {
  const doc = useEditor((s) => s.doc!)
  const [part, setPart] = useState('')
  const [copies, setCopies] = useState('2')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const templates = Object.values(doc.templates).sort((a, b) => a.createdAt - b.createdAt)
  const fronts = templates.filter((t) => t.side === 'front')
  const backs = templates.filter((t) => t.side === 'back')

  // Template parts of the chosen cards' templates, as "side:elementId".
  const parts = useMemo(() => {
    const out: { key: string; label: string }[] = []
    const seen = new Set<string>()
    for (const side of ['front', 'back'] as Side[])
      for (const id of ids) {
        const c = doc.cards[id]
        const tid = c && (side === 'front' ? c.frontTemplateId : c.backTemplateId)
        const t = tid ? doc.templates[tid] : undefined
        if (!t) continue
        for (const e of flatten(t.elements)) {
          const key = `${side}:${e.id}`
          if (seen.has(key) || e.toggleLocked || e.type === 'group') continue
          seen.add(key)
          out.push({ key, label: `${side === 'front' ? 'Front' : 'Back'} · ${e.name}` })
        }
      }
    return out
  }, [ids, doc.cards, doc.templates])

  const n = ids.length
  const disabled = n === 0
  const togglePart = (visible: boolean) => {
    const [side, el] = part.split(':') as [Side, Id]
    if (el) setPartOnCards(ids, side, el, visible)
  }

  return (
    <div
      className="flex shrink-0 flex-col gap-2 border-t bg-panel p-3"
      role="region"
      aria-label="Change selected cards"
      data-testid="bulk-bar"
    >
      <div className="text-xs font-medium">
        {n} card{n === 1 ? '' : 's'} selected
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="bulk-front">Front template</Label>
          <NativeSelect
            id="bulk-front"
            disabled={disabled}
            value=""
            onChange={(e) => e.target.value && setTemplateForCards(ids, 'front', e.target.value)}
          >
            <option value="">Change…</option>
            {fronts.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="bulk-back">Back template</Label>
          <NativeSelect
            id="bulk-back"
            disabled={disabled}
            value=""
            onChange={(e) =>
              e.target.value &&
              setTemplateForCards(ids, 'back', e.target.value === '-' ? null : e.target.value)
            }
          >
            <option value="">Change…</option>
            <option value="-">No back</option>
            {backs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="flex items-end gap-1">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor="bulk-part">Template part</Label>
          <NativeSelect
            id="bulk-part"
            disabled={disabled}
            value={part}
            onChange={(e) => setPart(e.target.value)}
          >
            <option value="">Choose a part…</option>
            {parts.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <IconButton
          label="Show this part on the selected cards"
          variant="outline"
          disabled={disabled || !part}
          onClick={() => togglePart(true)}
        >
          <Eye />
        </IconButton>
        <IconButton
          label="Hide this part on the selected cards"
          variant="outline"
          disabled={disabled || !part}
          onClick={() => togglePart(false)}
        >
          <EyeOff />
        </IconButton>
      </div>
      <div className="flex items-end gap-1">
        <div className="flex w-24 flex-col gap-1">
          <Label htmlFor="bulk-copies">Print copies</Label>
          <Input
            id="bulk-copies"
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          disabled={disabled || copies === ''}
          onClick={() => setAllCopies(ids, Number(copies), true)}
        >
          Set
        </Button>
        <div className="flex-1" />
        <IconButton
          label="Duplicate selected cards"
          variant="outline"
          disabled={disabled}
          onClick={() => onDone(duplicateCards(ids))}
        >
          <Copy />
        </IconButton>
        {confirmDelete ? (
          <Button
            variant="danger"
            onClick={() => {
              deleteCards(ids)
              setConfirmDelete(false)
              onDone([])
            }}
          >
            Delete {n}?
          </Button>
        ) : (
          <IconButton
            label="Delete selected cards"
            variant="outline"
            disabled={disabled}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
          </IconButton>
        )}
      </div>
    </div>
  )
}
