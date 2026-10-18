import { DropdownMenu as DM } from 'radix-ui'
import { cn } from '@/lib/cn'

export const DropdownMenu = DM.Root
export const DropdownMenuTrigger = DM.Trigger

export function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          'z-50 min-w-44 rounded-lg border bg-panel p-1 text-sm shadow-lg',
          className,
        )}
        {...props}
      />
    </DM.Portal>
  )
}

export function DropdownMenuItem({
  className,
  danger,
  ...props
}: React.ComponentProps<typeof DM.Item> & { danger?: boolean }) {
  return (
    <DM.Item
      className={cn(
        'flex h-11 cursor-default items-center gap-2 rounded-md px-2.5 outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-muted md:h-8 [&_svg]:size-4 [&_svg]:text-muted-foreground',
        danger && 'text-danger [&_svg]:text-danger',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-border" />
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return (
    <DM.Label
      className={cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

export const DropdownMenuRadioGroup = DM.RadioGroup

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DM.RadioItem>) {
  return (
    <DM.RadioItem
      className={cn(
        'flex h-11 cursor-default items-center gap-2 rounded-md px-2.5 outline-none select-none data-[highlighted]:bg-muted md:h-8 [&_svg]:size-4',
        className,
      )}
      {...props}
    >
      <span className="grid size-4 place-items-center">
        <DM.ItemIndicator>
          <span className="block size-2 rounded-full bg-accent" />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.RadioItem>
  )
}
