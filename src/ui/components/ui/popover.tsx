import { Popover as P } from 'radix-ui'
import { cn } from '@/lib/cn'

export const Popover = P.Root
export const PopoverTrigger = P.Trigger

export function PopoverContent({ className, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={6}
        collisionPadding={8}
        className={cn('z-50 w-64 rounded-lg border bg-panel p-3 shadow-lg', className)}
        {...props}
      />
    </P.Portal>
  )
}
