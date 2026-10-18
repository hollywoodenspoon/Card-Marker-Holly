import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5', className)}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-panel data-[state=active]:text-foreground data-[state=active]:shadow-sm md:h-7 [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsPrimitive.Content
