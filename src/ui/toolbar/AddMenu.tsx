import { Plus } from 'lucide-react'
import { useEditor } from '@/core/editor/editorStore'
import { ADD_ITEMS } from '@/ui/actions/addItems'
import { Button } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'

export function AddMenu() {
  const mode = useEditor((s) => s.view.mode)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus /> Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>
          {mode === 'template' ? 'Add to template' : 'Add to this card only'}
        </DropdownMenuLabel>
        {ADD_ITEMS.slice(0, 2).map((i) => (
          <DropdownMenuItem key={i.id} onSelect={() => i.run()}>
            <i.icon /> {i.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {ADD_ITEMS.slice(2).map((i) => (
          <DropdownMenuItem key={i.id} onSelect={() => i.run()}>
            <i.icon /> {i.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Grid version for the phone "Add" bottom sheet. */
export function AddGrid({ onDone }: { onDone: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 p-3">
      {ADD_ITEMS.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => {
            i.run()
            onDone()
          }}
          className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border bg-panel text-xs font-medium hover:bg-muted"
        >
          <i.icon className="size-5" />
          {i.label.replace(' (art box)', '')}
        </button>
      ))}
    </div>
  )
}
