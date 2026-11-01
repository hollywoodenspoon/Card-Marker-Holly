import { useState } from 'react'
import { IconButton } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { Plus, Trash2 } from '@/ui/icons'
import { useGameCards } from '../../cards/gameCards'
import { useCardFields } from './useCardFields'

/** A card field chosen from the ones the cards have ("" : none). */
export function FieldSelect({
  id,
  label,
  value,
  onChange,
  none,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  none: string
}) {
  const fields = useCardFields()
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{none}</option>
        {fields.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
        {value && !fields.includes(value) && <option value={value}>{value}</option>}
      </NativeSelect>
    </div>
  )
}

/** A list of cards: the chosen ones with a remove button, and a picker to add more. */
export function CardList({
  label,
  ids,
  onChange,
}: {
  label: string
  ids: string[]
  onChange: (ids: string[]) => void
}) {
  const cards = useGameCards((s) => s.merged?.pack.info.cards)
  const [pick, setPick] = useState('')
  const name = (id: string) => cards?.find((c) => c.id === id)?.name ?? `${id} (not in the cards)`
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`pick-${label}`}>{label}</Label>
      <ul className="flex flex-col gap-1">
        {ids.map((id) => (
          <li key={id} className="flex items-center gap-2 rounded-md border pl-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{name(id)}</span>
            <IconButton label={`Remove ${name(id)}`} onClick={() => onChange(ids.filter((x) => x !== id))}>
              <Trash2 />
            </IconButton>
          </li>
        ))}
        {!ids.length && <li className="text-xs text-muted-foreground">None.</li>}
      </ul>
      <div className="flex items-center gap-2">
        <NativeSelect id={`pick-${label}`} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Add a card…</option>
          {(cards ?? [])
            .filter((c) => !ids.includes(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </NativeSelect>
        <IconButton
          label="Add the card"
          disabled={!pick}
          onClick={() => {
            onChange([...ids, pick])
            setPick('')
          }}
        >
          <Plus />
        </IconButton>
      </div>
    </div>
  )
}
