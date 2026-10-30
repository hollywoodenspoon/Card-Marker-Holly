import { useWorkspace, WORKSPACES, type Workspace } from '@/app/workspace'
import { cn } from '@/lib/cn'
import { Box, Check, ChevronDown, LayoutTemplate, Swords } from '@/ui/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { useLayout } from './useLayout'

const ICONS: Record<Workspace, typeof Box> = { cards: LayoutTemplate, engine: Box, play: Swords }

/**
 * Cards · Engine · Play: the switch at the start of every workspace's top bar.
 * A segmented control on wider screens, a menu on phones. Not in Cozy (Cards only).
 */
export function WorkspaceSwitch({ className }: { className?: string }) {
  const ws = useWorkspace((s) => s.ws)
  const phone = useLayout() === 'phone'
  if (__COZY__) return null
  const go = (id: Workspace) => id !== ws && useWorkspace.getState().go(id)
  const Current = ICONS[ws]
  if (phone)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Switch workspace"
          className={cn(
            'inline-flex h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium hover:bg-muted',
            className,
          )}
        >
          <Current className="size-4 text-accent" />
          {WORKSPACES.find((w) => w.id === ws)?.label}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {WORKSPACES.map((w) => {
            const Icon = ICONS[w.id]
            return (
              <DropdownMenuItem key={w.id} onSelect={() => go(w.id)}>
                <Icon /> {w.label}
                {w.id === ws && <Check className="ml-auto" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  return (
    <div
      role="tablist"
      aria-label="Workspace"
      className={cn('flex shrink-0 items-center rounded-lg bg-muted p-0.5', className)}
    >
      {WORKSPACES.map((w) => {
        const Icon = ICONS[w.id]
        const on = w.id === ws
        return (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={on}
            data-testid={`workspace-${w.id}`}
            onClick={() => go(w.id)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 pointer-coarse:h-11 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors',
              'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              on && 'bg-panel text-foreground shadow-sm',
            )}
          >
            <Icon className={cn('size-4', on && 'text-accent')} />
            {w.label}
          </button>
        )
      })}
    </div>
  )
}
