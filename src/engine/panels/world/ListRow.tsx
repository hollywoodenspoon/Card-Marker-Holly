import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/components/ui/button'
import { Copy, Trash2 } from '@/ui/icons'

/** A row in a left-panel list that opens in the centre, with duplicate and delete. */
export function ListRow({
  name,
  detail,
  active,
  onOpen,
  onDuplicate,
  onDelete,
  icon,
}: {
  name: string
  detail?: string
  active: boolean
  onOpen: () => void
  onDuplicate?: () => void
  onDelete: () => void
  icon?: React.ReactNode
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-1 rounded-md border pl-2',
        active && 'border-accent bg-accent/10',
      )}
    >
      {icon}
      <button
        type="button"
        className="min-h-11 min-w-0 flex-1 truncate py-1.5 text-left text-sm md:min-h-9"
        onClick={onOpen}
      >
        {name || 'Untitled'}
        {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </button>
      {onDuplicate && (
        <IconButton label={`Duplicate ${name}`} size="icon-sm" onClick={onDuplicate}>
          <Copy />
        </IconButton>
      )}
      <IconButton label={`Delete ${name}`} size="icon-sm" onClick={onDelete}>
        <Trash2 />
      </IconButton>
    </li>
  )
}
