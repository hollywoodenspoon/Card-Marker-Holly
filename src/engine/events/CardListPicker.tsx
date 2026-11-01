import { IconButton } from '@/ui/components/ui/button'
import { Input, NativeSelect } from '@/ui/components/ui/input'
import { Trash2 } from '@/ui/icons'
import { formatCardList, parseCardList } from './cardList'

/** Several cards with a number of copies each: add from the game's cards, change, remove. */
export function CardListPicker({
  label,
  value,
  cards,
  onChange,
}: {
  label: string
  value: unknown
  cards: { id: string; name: string }[]
  onChange: (value: string | undefined) => void
}) {
  const list = parseCardList(value)
  const name = (id: string) => cards.find((c) => c.id === id)?.name ?? `${id} (missing)`
  const save = (next: typeof list) => onChange(formatCardList(next) || undefined)
  return (
    <span className="flex w-full min-w-48 basis-full flex-col gap-1" data-testid="card-list">
      {list.map((c) => (
        <span key={c.id} className="flex items-center gap-1 text-xs">
          <span className="min-w-0 flex-1 truncate" title={name(c.id)}>
            {name(c.id)}
          </span>
          <Input
            type="number"
            min={1}
            aria-label={`Copies of ${name(c.id)}`}
            className="h-7 w-16 text-xs"
            value={c.n}
            onChange={(e) =>
              save(list.map((x) => (x.id === c.id ? { ...x, n: Math.max(1, Number(e.target.value) || 1) } : x)))
            }
          />
          <IconButton
            label={`Remove ${name(c.id)}`}
            size="icon-sm"
            onClick={() => save(list.filter((x) => x.id !== c.id))}
          >
            <Trash2 />
          </IconButton>
        </span>
      ))}
      <NativeSelect
        aria-label={`Add to ${label.toLowerCase()}`}
        className="h-7 w-auto max-w-64 text-xs font-medium"
        value=""
        onChange={(e) => e.target.value && save([...list, { id: e.target.value, n: 1 }])}
      >
        <option value="">
          {cards.length ? (list.length ? 'Add another card…' : 'Add a card…') : 'No cards loaded yet'}
        </option>
        {cards
          .filter((c) => !list.some((x) => x.id === c.id))
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </NativeSelect>
    </span>
  )
}
